/** Trace event types for observing the agent's ReAct loop */

export type TraceEvent =
  | TraceStart
  | TraceThinking
  | TraceToolCall
  | TraceToolResult
  | TraceText
  | TraceError
  | TraceAskUser
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

export interface TraceAskUser extends TraceBase {
  type: "trace:ask_user";
  question: string;
  questionType: "select" | "multi_select" | "text" | "confirm";
  options?: string[];
  placeholder?: string;
  answer?: string;
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

/** Payload sent from server when agent calls ask_user */
export interface AskUserPayload {
  eventId: string;
  traceId: string;
  question: string;
  questionType: "select" | "multi_select" | "text" | "confirm";
  options?: string[];
  placeholder?: string;
}

/** Payload sent from client when user answers an ask_user question */
export interface UserAnswerPayload {
  eventId: string;
  answer: string;
}

/** Socket.io event types shared between client and server */

export interface ServerToClientEvents {
  "connection:ack": (data: { status: string }) => void;
  "trace:event": (event: TraceEvent) => void;
  "agent:message": (data: { traceId: string; text: string; structuredResults?: unknown[] }) => void;
  "agent:error": (data: { traceId: string; message: string }) => void;
  "agent:ask_user": (data: AskUserPayload) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  "user:message": (message: UserMessage) => void;
  "user:answer": (data: UserAnswerPayload) => void;
  "language:set": (data: { language: string }) => void;
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
