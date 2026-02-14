import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Server as SocketIOServer } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
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

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit("connection:ack", { status: "connected" });

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

    const traceId = crypto.randomUUID();
    console.log(`[${traceId}] User message: ${message.text}`);

    const emit = (event: import("@canopy/shared").TraceEvent) => {
      traceStore.add(event);
      appendTraceEvent(event).catch((err) =>
        console.error(`[trace-writer] Failed to write event:`, err)
      );
      socket.emit("trace:event", event);
    };

    try {
      const text = await runReactLoop({
        userMessage: message.text,
        traceId,
        emit,
      });
      socket.emit("agent:message", { traceId, text });
    } catch (err: any) {
      console.error(`[${traceId}] Error:`, err);
      socket.emit("agent:error", {
        traceId,
        message: err.message ?? "Unknown error",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

io.engine.on("connection_error", (err: any) => {
  console.error(`[socket.io] Connection error:`, err.message);
});
