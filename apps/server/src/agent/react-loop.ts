import { ThinkingLevel } from "@google/genai";
import type { Content, GenerateContentResponse, Part } from "@google/genai";
import type { TraceEvent } from "@canopy/shared";
import { gemini, FLASH_MODEL } from "../gemini";
import { SYSTEM_PROMPT } from "./system-prompt";
import { createTraceEvent } from "./trace";
import { toolDeclarations } from "../tools";
import { executeTool } from "../tools/executor";

const MAX_ITERATIONS = 10;
const MAX_RETRIES = 3;
const MAX_EMPTY_RESPONSES = 2;

// --- Retry helpers ---

function isRetryableError(err: any): boolean {
  const status = err?.status ?? err?.statusCode ?? err?.code;
  if ([429, 500, 503].includes(status)) return true;
  const code = err?.code ?? err?.cause?.code;
  if (
    typeof code === "string" &&
    ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT"].includes(code)
  )
    return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(
  params: Parameters<typeof gemini.models.generateContent>[0],
  opts: { traceId: string; iteration: number; emit: (e: TraceEvent) => void }
): Promise<GenerateContentResponse> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await gemini.models.generateContent(params);
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1 && isRetryableError(err)) {
        const backoffMs = 1000 * 2 ** attempt; // 1s, 2s, 4s
        opts.emit(
          createTraceEvent({
            type: "trace:error",
            traceId: opts.traceId,
            iteration: opts.iteration,
            message: `Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message ?? "unknown"}. Retrying in ${backoffMs}ms…`,
          })
        );
        await delay(backoffMs);
        continue;
      }
      throw err;
    }
  }
  // Unreachable but satisfies TypeScript
  throw new Error("Retry loop exited unexpectedly");
}

// --- Turn alternation validation ---

function validateTurnAlternation(messages: Content[]): void {
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      throw new Error(
        `Turn alternation violated: consecutive "${messages[i].role}" at indices ${i - 1} and ${i}`
      );
    }
  }
}

interface RunReactLoopParams {
  userMessage: string;
  traceId: string;
  emit: (event: TraceEvent) => void;
  waitForUserAnswer: (eventId: string) => Promise<string>;
}

interface ReActResult {
  text: string;
  structuredResults: unknown[];
}

export async function runReactLoop({
  userMessage,
  traceId,
  emit,
  waitForUserAnswer,
}: RunReactLoopParams): Promise<ReActResult> {
  const messages: Content[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const structuredResults: unknown[] = [];

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

  let consecutiveEmptyResponses = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Validate turn alternation before calling the API
    validateTurnAlternation(messages);

    let response;
    try {
      response = await callGeminiWithRetry(
        {
          model: FLASH_MODEL,
          contents: messages,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [
              { functionDeclarations: toolDeclarations },
            ],
            thinkingConfig: {
              includeThoughts: true,
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        },
        { traceId, iteration, emit }
      );
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
      // No tool calls — check for empty response
      const text = response.text ?? "";

      if (text.trim() === "") {
        consecutiveEmptyResponses++;
        if (consecutiveEmptyResponses >= MAX_EMPTY_RESPONSES) {
          emit(
            createTraceEvent({
              type: "trace:error",
              traceId,
              iteration,
              message: `Model returned ${MAX_EMPTY_RESPONSES} consecutive empty responses. Stopping.`,
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
          return { text: "I wasn't able to generate a response. Please try rephrasing your question.", structuredResults };
        }

        // Push the model's empty content + a nudge, then continue
        if (candidate?.content) {
          messages.push(candidate.content);
        } else {
          messages.push({ role: "model", parts: [{ text: "" }] });
        }
        messages.push({
          role: "user",
          parts: [{ text: "Please continue and provide your answer." }],
        });
        continue;
      }

      // Non-empty text — reset counter and return
      consecutiveEmptyResponses = 0;

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
      return { text, structuredResults };
    }

    // Function calls present — reset empty counter
    consecutiveEmptyResponses = 0;

    // Append the model's response (with function calls) to messages.
    // Synthesize content from function calls if candidate.content is missing.
    const modelContent: Content = candidate?.content ?? {
      role: "model",
      parts: functionCalls.map((fc) => ({
        functionCall: { name: fc.name ?? "unknown", args: fc.args },
      })),
    };
    messages.push(modelContent);

    // Execute each tool call
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      const name = fc.name ?? "unknown";
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
      let result: unknown;
      let isError: boolean;

      if (name === "ask_user") {
        const question = (args.question as string) ?? "Can you clarify?";
        const questionType = (args.type as string) ?? "text";
        const options = args.options as string[] | undefined;
        const placeholder = args.placeholder as string | undefined;

        const askEvent = createTraceEvent({
          type: "trace:ask_user",
          traceId,
          iteration,
          question,
          questionType: questionType as "select" | "multi_select" | "text" | "confirm",
          options,
          placeholder,
        });
        emit(askEvent);

        try {
          const answer = await waitForUserAnswer(askEvent.eventId);
          result = { answer };
          isError = false;
        } catch (err: any) {
          result = { error: err.message ?? "User did not respond" };
          isError = true;
        }
      } else {
        try {
          ({ result, isError } = await executeTool(name, args));
        } catch (toolErr: any) {
          result = { error: `Tool execution failed: ${toolErr.message ?? "unknown error"}` };
          isError = true;
        }
      }

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

      // Collect structured results for the chat panel
      const resultObj = result as Record<string, unknown>;
      if (!isError && (resultObj?.type === "comparison" || resultObj?.type === "checklist")) {
        structuredResults.push(resultObj);
      }

      functionResponseParts.push({
        functionResponse: {
          name,
          response: resultObj,
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

  return { text: "I ran out of steps while working on your request. Please try again with a simpler question.", structuredResults };
}
