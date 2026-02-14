import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TraceEvent,
  UserAnswerPayload,
  TraceAskUser,
} from "@canopy/shared";
import { gemini, FLASH_MODEL } from "./gemini";
import { runReactLoop } from "./agent/react-loop";
import { traceStore } from "./agent/trace";
import {
  ensureTracesDir,
  appendTraceEvent,
  listTraceFiles,
  readTraceFile,
} from "./agent/trace-writer";

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:5173", credentials: true }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/health/gemini", async (c) => {
  try {
    const response = await gemini.models.generateContent({
      model: FLASH_MODEL,
      contents: "Reply with exactly: ok",
    });
    return c.json({
      status: "ok",
      model: FLASH_MODEL,
      response: response.text?.slice(0, 100),
    });
  } catch (err: any) {
    return c.json({ status: "error", message: err.message }, 500);
  }
});

// Debug endpoints for trace inspection (in-memory)
app.get("/api/traces", (c) => c.json(traceStore.list()));

// Persisted JSONL trace endpoints (must register before :traceId param route)
app.get("/api/traces/files", async (c) => {
  const files = await listTraceFiles();
  return c.json(files);
});

app.get("/api/traces/files/:traceId", async (c) => {
  const { traceId } = c.req.param();
  const events = await readTraceFile(traceId);
  if (!events) {
    return c.json({ error: "Trace file not found" }, 404);
  }
  return c.json({ traceId, events });
});

app.get("/api/traces/:traceId", (c) => {
  const { traceId } = c.req.param();
  const events = traceStore.get(traceId);
  if (!events) {
    return c.json({ error: "Trace not found" }, 404);
  }
  return c.json({ traceId, events });
});

// Ensure traces directory exists before starting
await ensureTracesDir();

const PORT = Number(process.env.PORT) || 3001;

const httpServer = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
  httpServer,
  {
    cors: { origin: "http://localhost:5173", credentials: true },
  }
);

function createWaitForUserAnswer(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  return (eventId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off("user:answer", handler);
        reject(new Error("User did not respond within 2 minutes"));
      }, 120_000);

      const handler = (data: UserAnswerPayload) => {
        if (data.eventId === eventId) {
          clearTimeout(timeout);
          socket.off("user:answer", handler);
          resolve(data.answer);
        }
      };
      socket.on("user:answer", handler);
    });
  };
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit("connection:ack", { status: "connected" });

  const waitForUserAnswer = createWaitForUserAnswer(socket);
  let selectedLanguage: string | undefined;
  let activeAbortController: AbortController | null = null;

  socket.on("language:set", (data) => {
    selectedLanguage = data.language;
    console.log(`[${socket.id}] Language set to: ${data.language}`);
  });

  socket.on("ping", () => {
    console.log(`Ping from ${socket.id}`);
  });

  socket.on("error", (err) => {
    console.error(`[socket] Error on ${socket.id}:`, err.message);
  });

  socket.on("user:message", async (message) => {
    if (!message || typeof message.text !== "string" || message.text.trim() === "") {
      socket.emit("agent:error", {
        traceId: "validation",
        message: "Message text is required",
      });
      return;
    }

    // Abort any previous in-flight request
    if (activeAbortController) {
      activeAbortController.abort();
    }
    const abortController = new AbortController();
    activeAbortController = abortController;

    const traceId = crypto.randomUUID();
    console.log(`[${traceId}] User message: ${message.text}`);

    const emit = (event: TraceEvent) => {
      if (abortController.signal.aborted) return;
      traceStore.add(event);
      appendTraceEvent(event).catch((err) =>
        console.error(`[trace-writer] Failed to write event:`, err)
      );
      socket.emit("trace:event", event);

      // Also emit the dedicated ask_user event for the frontend
      if (event.type === "trace:ask_user") {
        const askEvent = event as TraceAskUser;
        socket.emit("agent:ask_user", {
          eventId: askEvent.eventId,
          traceId: askEvent.traceId,
          question: askEvent.question,
          questionType: askEvent.questionType,
          options: askEvent.options,
          placeholder: askEvent.placeholder,
        });
      }
    };

    try {
      const { text, structuredResults } = await runReactLoop({
        userMessage: message.text,
        traceId,
        emit,
        waitForUserAnswer,
        language: selectedLanguage,
        signal: abortController.signal,
      });
      if (!abortController.signal.aborted) {
        socket.emit("agent:message", { traceId, text, structuredResults });
      }
    } catch (err: any) {
      if (err.name === "AbortError" || abortController.signal.aborted) {
        console.log(`[${traceId}] Aborted (session reset)`);
        return;
      }
      console.error(`[${traceId}] Error:`, err);
      socket.emit("agent:error", {
        traceId,
        message: err.message ?? "Unknown error",
      });
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  });

  socket.on("session:reset", () => {
    console.log(`[${socket.id}] Session reset`);
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    selectedLanguage = undefined;
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

io.engine.on("connection_error", (err: any) => {
  console.error(`[socket.io] Connection error:`, err.message);
});
