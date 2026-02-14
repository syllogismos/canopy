import { useState } from "react";
import type { TraceEvent } from "@canopy/shared";

interface InlineThinkingProps {
  events: TraceEvent[];
}

export function InlineThinking({ events }: InlineThinkingProps) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const statusLine = getStatusLine(events);
  const displayEvents = events.filter(
    (e) => e.type === "trace:thinking" || e.type === "trace:tool_call" || e.type === "trace:tool_result" || e.type === "trace:ask_user"
  );

  return (
    <div className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
      <div className="max-w-[85%] w-full rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] overflow-hidden">
        {/* Collapsed header — always visible */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        >
          <Spinner />
          <span className="text-xs text-gray-400 flex-1 truncate">{statusLine}</span>
          <Chevron expanded={expanded} />
        </button>

        {/* Expanded trace list */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-3 space-y-1.5 overflow-y-auto max-h-[460px]">
            {displayEvents.map((event) => (
              <CompactTraceItem key={event.eventId} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders a compact inline trace for completed messages (collapsible) */
export function MessageTraceToggle({ events }: { events: TraceEvent[] }) {
  const [expanded, setExpanded] = useState(false);

  const displayEvents = events.filter(
    (e) => e.type === "trace:thinking" || e.type === "trace:tool_call" || e.type === "trace:tool_result" || e.type === "trace:ask_user"
  );

  if (displayEvents.length === 0) return null;

  const endEvent = events.find((e) => e.type === "trace:end") as
    | Extract<TraceEvent, { type: "trace:end" }>
    | undefined;
  const durationSec = endEvent ? (endEvent.durationMs / 1000).toFixed(1) : null;
  const steps = endEvent?.totalIterations ?? displayEvents.length;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
      >
        <Chevron expanded={expanded} />
        <span>
          {durationSec ? `Thought for ${durationSec}s` : "Reasoning"} · {steps}{" "}
          {steps === 1 ? "step" : "steps"}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-1.5 pl-1 border-l border-white/[0.06] ml-1">
          {displayEvents.map((event) => (
            <CompactTraceItem key={event.eventId} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Compact trace event representations ─── */

function CompactTraceItem({ event }: { event: TraceEvent }) {
  switch (event.type) {
    case "trace:thinking":
      return (
        <div className="text-[11px] text-violet-300/60 italic line-clamp-3 leading-relaxed pl-2">
          {event.text}
        </div>
      );
    case "trace:tool_call":
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/10">
          <SearchIcon />
          <span className="text-[11px] text-cyan-300/80 truncate">
            {getToolLabel(event)}
          </span>
        </div>
      );
    case "trace:tool_result":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            event.isError
              ? "bg-red-500/[0.06] border border-red-500/10"
              : "bg-emerald-500/[0.06] border border-emerald-500/10"
          }`}
        >
          {event.isError ? <ErrorIcon /> : <CheckIcon />}
          <span
            className={`text-[11px] truncate ${
              event.isError ? "text-red-300/80" : "text-emerald-300/80"
            }`}
          >
            {event.name}
          </span>
          {event.durationMs > 0 && (
            <span className="text-[10px] text-gray-600 tabular-nums">
              {event.durationMs < 1000
                ? `${event.durationMs}ms`
                : `${(event.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      );
    case "trace:ask_user":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            event.answer
              ? "bg-emerald-500/[0.06] border border-emerald-500/10"
              : "bg-amber-500/[0.06] border border-amber-500/10"
          }`}
        >
          <QuestionIcon answered={!!event.answer} />
          <span className={`text-[11px] truncate ${event.answer ? "text-emerald-300/80" : "text-amber-300/80"}`}>
            {event.answer ? `${event.question} → ${event.answer}` : event.question}
          </span>
        </div>
      );
    default:
      return null;
  }
}

/* ─── Helpers ─── */

function getStatusLine(events: TraceEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "trace:ask_user") {
      return "Waiting for your answer...";
    }
    if (e.type === "trace:tool_call") {
      return `Searching: ${getToolLabel(e)}`;
    }
    if (e.type === "trace:thinking") {
      return "Thinking...";
    }
    if (e.type === "trace:tool_result") {
      return `Processing results...`;
    }
  }
  return "Canopy is working...";
}

function getToolLabel(event: Extract<TraceEvent, { type: "trace:tool_call" }>): string {
  if (event.name === "google_search" && event.args.queries) {
    return (event.args.queries as string[]).join(", ");
  }
  const args = Object.values(event.args);
  if (args.length > 0 && typeof args[0] === "string") {
    return `${event.name}: ${args[0]}`;
  }
  return event.name;
}

/* ─── Icons ─── */

function Spinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin text-amber-400/70"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-600 transition-transform duration-200 shrink-0 ${
        expanded ? "rotate-90" : ""
      }`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-cyan-400/50 shrink-0">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-emerald-400/60 shrink-0">
      <path d="M3 8.5l3.5 3.5 6.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-red-400/60 shrink-0">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon({ answered }: { answered: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className={`${answered ? "text-emerald-400/60" : "text-amber-400/60"} shrink-0`}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6.5a2 2 0 1 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}
