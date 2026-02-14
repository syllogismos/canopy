import type { Content, Part } from "@google/genai";
import type { TraceEvent } from "@canopy/shared";
import { gemini, FLASH_MODEL } from "../gemini";
import { SYSTEM_PROMPT } from "./system-prompt";
import { createTraceEvent } from "./trace";
import { toolDeclarations } from "../tools";
import { executeTool } from "../tools/executor";

const MAX_ITERATIONS = 10;

interface RunReactLoopParams {
  userMessage: string;
  traceId: string;
  emit: (event: TraceEvent) => void;
}

export async function runReactLoop({
  userMessage,
  traceId,
  emit,
}: RunReactLoopParams): Promise<string> {
  const messages: Content[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const startTime = Date.now();

  emit(
    createTraceEvent({
      type: "trace:start",
      traceId,
      iteration: 0,
      userMessage,
      model: FLASH_MODEL,
      maxIterations: MAX_ITERATIONS,
    })
  );

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let response;
    try {
      response = await gemini.models.generateContent({
        model: FLASH_MODEL,
        contents: messages,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [
            { functionDeclarations: toolDeclarations },
            { googleSearch: {} },
          ],
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "HIGH",
          },
        },
      });
    } catch (err: any) {
      emit(
        createTraceEvent({
          type: "trace:error",
          traceId,
          iteration,
          message: err.message ?? "Gemini API error",
        })
      );
      emit(
        createTraceEvent({
          type: "trace:end",
          traceId,
          iteration,
          totalIterations: iteration + 1,
          durationMs: Date.now() - startTime,
          status: "error",
        })
      );
      throw err;
    }

    // Extract thoughts from response parts
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.thought && part.text) {
          emit(
            createTraceEvent({
              type: "trace:thinking",
              traceId,
              iteration,
              text: part.text,
            })
          );
        }
      }
    }

    // Check for grounding metadata
    const groundingMetadata = candidate?.groundingMetadata;
    if (groundingMetadata?.webSearchQueries?.length) {
      emit(
        createTraceEvent({
          type: "trace:tool_call",
          traceId,
          iteration,
          name: "google_search",
          args: { queries: groundingMetadata.webSearchQueries },
        })
      );
      const sources =
        groundingMetadata.groundingChunks?.map(
          (chunk: any) => chunk.web?.title ?? chunk.web?.uri ?? "unknown"
        ) ?? [];
      emit(
        createTraceEvent({
          type: "trace:tool_result",
          traceId,
          iteration,
          name: "google_search",
          result: { sources },
          durationMs: 0,
          isError: false,
        })
      );
    }

    // Check for function calls
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      // No tool calls — this is the final response
      const text = response.text ?? "";
      emit(
        createTraceEvent({
          type: "trace:text",
          traceId,
          iteration,
          text,
        })
      );
      emit(
        createTraceEvent({
          type: "trace:end",
          traceId,
          iteration,
          totalIterations: iteration + 1,
          durationMs: Date.now() - startTime,
          status: "completed",
        })
      );
      return text;
    }

    // Append the model's response (with function calls) to messages
    if (candidate?.content) {
      messages.push(candidate.content);
    }

    // Execute each tool call
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      const name = fc.name!;
      const args = (fc.args as Record<string, unknown>) ?? {};

      emit(
        createTraceEvent({
          type: "trace:tool_call",
          traceId,
          iteration,
          name,
          args,
        })
      );

      const toolStart = Date.now();
      const { result, isError } = executeTool(name, args);
      const durationMs = Date.now() - toolStart;

      emit(
        createTraceEvent({
          type: "trace:tool_result",
          traceId,
          iteration,
          name,
          result,
          durationMs,
          isError,
        })
      );

      functionResponseParts.push({
        functionResponse: {
          name,
          response: result as object,
        },
      });
    }

    // Append function responses to messages
    messages.push({
      role: "user",
      parts: functionResponseParts,
    });
  }

  // Exhausted iterations
  emit(
    createTraceEvent({
      type: "trace:end",
      traceId,
      iteration: MAX_ITERATIONS,
      totalIterations: MAX_ITERATIONS,
      durationMs: Date.now() - startTime,
      status: "max_iterations",
    })
  );

  return "I ran out of steps while working on your request. Please try again with a simpler question.";
}
