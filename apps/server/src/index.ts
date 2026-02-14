import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Server as SocketIOServer } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@canopy/shared";
import { gemini, FLASH_MODEL } from "./gemini";

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

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
