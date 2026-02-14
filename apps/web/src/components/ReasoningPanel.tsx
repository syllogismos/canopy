import { useEffect, useRef } from "react";
import type { TraceEvent } from "@canopy/shared";
import { TraceCard } from "./TraceCards";

interface ReasoningPanelProps {
  traceEvents: TraceEvent[];
  isProcessing: boolean;
}

export function ReasoningPanel({ traceEvents, isProcessing }: ReasoningPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [traceEvents]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? "bg-amber-400 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-xs font-medium tracking-widest uppercase text-gray-400 font-mono">
            Reasoning Trace
          </span>
        </div>
        {traceEvents.length > 0 && (
          <span className="text-[10px] text-gray-600 tabular-nums font-mono">
            {traceEvents.length} events
          </span>
        )}
      </div>

      {/* Trace events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth">
        {traceEvents.length === 0 ? (
          <EmptyTraceState />
        ) : (
          traceEvents.map((event) => (
            <TraceCard key={event.eventId} event={event} />
          ))
        )}

        {isProcessing && traceEvents.length > 0 && <PulseBar />}
      </div>
    </div>
  );
}

function EmptyTraceState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-[fadeIn_0.6s_ease-out]">
      {/* Trace visualization placeholder */}
      <div className="relative mb-6 flex flex-col gap-1.5 opacity-20">
        {[40, 64, 52, 36, 56].map((w, i) => (
          <div
            key={i}
            className="h-2 rounded-full bg-gradient-to-r from-gray-500/40 to-transparent"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600 max-w-[200px] leading-relaxed">
        Reasoning trace will appear here as Canopy works through your request
      </p>
    </div>
  );
}

function PulseBar() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 via-amber-400/10 to-transparent animate-pulse" />
    </div>
  );
}
