/** Trace event types for observing the agent's ReAct loop */

export type TraceEvent =
  | TraceStart
  | TraceThinking
  | TraceToolCall
  | TraceToolResult
  | TraceText
  | TraceError
  | TraceEnd;

interface TraceBase {
  eventId: string;
  traceId: string;
  iteration: number;
  timestamp: number;
}

export interface TraceStart extends TraceBase {
  type: "trace:start";
  userMessage: string;
  model: string;
  maxIterations: number;
}

export interface TraceThinking extends TraceBase {
  type: "trace:thinking";
  text: string;
}

export interface TraceToolCall extends TraceBase {
  type: "trace:tool_call";
  name: string;
  args: Record<string, unknown>;
}

export interface TraceToolResult extends TraceBase {
  type: "trace:tool_result";
  name: string;
  result: unknown;
  durationMs: number;
  isError: boolean;
}

export interface TraceText extends TraceBase {
  type: "trace:text";
  text: string;
}

export interface TraceError extends TraceBase {
  type: "trace:error";
  message: string;
}

export interface TraceEnd extends TraceBase {
  type: "trace:end";
  totalIterations: number;
  durationMs: number;
  status: "completed" | "max_iterations" | "error";
}

/** User message sent from client */
export interface UserMessage {
  id: string;
  text: string;
  timestamp: number;
}

/** Socket.io event types shared between client and server */

export interface ServerToClientEvents {
  "connection:ack": (data: { status: string }) => void;
  "trace:event": (event: TraceEvent) => void;
  "agent:message": (data: { traceId: string; text: string; structuredResults?: unknown[] }) => void;
  "agent:error": (data: { traceId: string; message: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  "user:message": (message: UserMessage) => void;
}

/** Metadata for a persisted JSONL trace file */
export interface TraceFileMeta {
  filename: string;
  traceId: string;
  timestamp: number;
  eventCount: number;
  userMessage?: string;
  status?: "completed" | "max_iterations" | "error";
  durationMs?: number;
}
