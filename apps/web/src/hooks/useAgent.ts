import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import type { TraceEvent, AskUserPayload } from "@canopy/shared";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  traceId?: string;
  structuredResults?: unknown[];
  traceEvents?: TraceEvent[];
  timestamp: number;
}

export interface PendingQuestion {
  eventId: string;
  traceId: string;
  question: string;
  questionType: "select" | "multi_select" | "text" | "confirm";
  options?: string[];
  placeholder?: string;
  timestamp: number;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [activeTraceEvents, setActiveTraceEvents] = useState<TraceEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);

  // Accumulate structured results from trace events keyed by traceId.
  // This ref is filled as trace:tool_result events arrive (before agent:message).
  const pendingStructured = useRef<Map<string, unknown[]>>(new Map());
  // Accumulate trace events per traceId so we can snapshot them onto the ChatMessage
  const pendingTraceEvents = useRef<Map<string, TraceEvent[]>>(new Map());

  useEffect(() => {
    const onTraceEvent = (event: TraceEvent) => {
      setTraceEvents((prev) => [...prev, event]);

      // Accumulate into activeTraceEvents for live UI
      setActiveTraceEvents((prev) => [...prev, event]);

      // Accumulate into ref for snapshotting onto ChatMessage
      const list = pendingTraceEvents.current.get(event.traceId) ?? [];
      list.push(event);
      pendingTraceEvents.current.set(event.traceId, list);

      // Collect structured tool results (comparison tables, checklists)
      if (event.type === "trace:tool_result" && !event.isError) {
        const r = event.result as Record<string, unknown> | null;
        if (r && (r.type === "comparison" || r.type === "checklist")) {
          const srList = pendingStructured.current.get(event.traceId) ?? [];
          srList.push(r);
          pendingStructured.current.set(event.traceId, srList);
        }
      }

      if (event.type === "trace:start") {
        setIsProcessing(true);
      }
      if (event.type === "trace:end") {
        setIsProcessing(false);
        setPendingQuestion(null);
      }
    };

    const onAgentMessage = (data: { traceId: string; text: string; structuredResults?: unknown[] }) => {
      // Prefer server-provided structured results; fall back to what we collected from trace events
      const sr =
        data.structuredResults && data.structuredResults.length > 0
          ? data.structuredResults
          : pendingStructured.current.get(data.traceId);

      // Snapshot accumulated trace events for this message
      const snapshotTrace = pendingTraceEvents.current.get(data.traceId);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: data.text,
          traceId: data.traceId,
          structuredResults: sr && sr.length > 0 ? sr : undefined,
          traceEvents: snapshotTrace && snapshotTrace.length > 0 ? [...snapshotTrace] : undefined,
          timestamp: Date.now(),
        },
      ]);

      pendingStructured.current.delete(data.traceId);
      pendingTraceEvents.current.delete(data.traceId);
      setActiveTraceEvents([]);
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
      pendingStructured.current.delete(data.traceId);
      pendingTraceEvents.current.delete(data.traceId);
      setActiveTraceEvents([]);
      setIsProcessing(false);
      setPendingQuestion(null);
    };

    const onAskUser = (data: AskUserPayload) => {
      setPendingQuestion({
        eventId: data.eventId,
        traceId: data.traceId,
        question: data.question,
        questionType: data.questionType,
        options: data.options,
        placeholder: data.placeholder,
        timestamp: Date.now(),
      });
      // Add the question as an agent message in the chat
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: data.question,
          traceId: data.traceId,
          timestamp: Date.now(),
        },
      ]);
    };

    socket.on("trace:event", onTraceEvent);
    socket.on("agent:message", onAgentMessage);
    socket.on("agent:error", onAgentError);
    socket.on("agent:ask_user", onAskUser);

    return () => {
      socket.off("trace:event", onTraceEvent);
      socket.off("agent:message", onAgentMessage);
      socket.off("agent:error", onAgentError);
      socket.off("agent:ask_user", onAskUser);
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id, role: "user", text, timestamp: Date.now() },
    ]);
    setTraceEvents([]);
    socket.emit("user:message", { id, text, timestamp: Date.now() });
  }, []);

  const answerQuestion = useCallback((eventId: string, answer: string) => {
    socket.emit("user:answer", { eventId, answer });
    setPendingQuestion(null);
    // Add the answer as a user message in the chat
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: answer,
        timestamp: Date.now(),
      },
    ]);
    // Update the matching trace:ask_user event with the answer
    setTraceEvents((prev) =>
      prev.map((e) =>
        e.type === "trace:ask_user" && e.eventId === eventId
          ? { ...e, answer }
          : e
      )
    );
    setActiveTraceEvents((prev) =>
      prev.map((e) =>
        e.type === "trace:ask_user" && e.eventId === eventId
          ? { ...e, answer }
          : e
      )
    );
  }, []);

  return { messages, traceEvents, activeTraceEvents, isProcessing, pendingQuestion, sendMessage, answerQuestion };
}
