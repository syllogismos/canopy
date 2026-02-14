import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import type { TraceEvent } from "@canopy/shared";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  traceId?: string;
  timestamp: number;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentTraceId = useRef<string | null>(null);

  useEffect(() => {
    const onTraceEvent = (event: TraceEvent) => {
      setTraceEvents((prev) => [...prev, event]);

      if (event.type === "trace:start") {
        setIsProcessing(true);
      }
      if (event.type === "trace:end" || event.type === "trace:error") {
        setIsProcessing(false);
      }
    };

    const onAgentMessage = (data: { traceId: string; text: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: data.text,
          traceId: data.traceId,
          timestamp: Date.now(),
        },
      ]);
      setIsProcessing(false);
    };

    const onAgentError = (data: { traceId: string; message: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: `Error: ${data.message}`,
          traceId: data.traceId,
          timestamp: Date.now(),
        },
      ]);
      setIsProcessing(false);
    };

    socket.on("trace:event", onTraceEvent);
    socket.on("agent:message", onAgentMessage);
    socket.on("agent:error", onAgentError);

    return () => {
      socket.off("trace:event", onTraceEvent);
      socket.off("agent:message", onAgentMessage);
      socket.off("agent:error", onAgentError);
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id, role: "user", text, timestamp: Date.now() },
    ]);
    setTraceEvents([]);
    currentTraceId.current = id;
    socket.emit("user:message", { id, text, timestamp: Date.now() });
  }, []);

  return { messages, traceEvents, isProcessing, sendMessage };
}
