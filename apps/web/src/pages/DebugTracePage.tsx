import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { TraceFileMeta, TraceEvent } from "@canopy/shared";
import { TraceCard } from "../components/TraceCards";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDuration(ms?: number): string {
  if (!ms) return "--";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const statusConfig: Record<string, { dot: string; label: string }> = {
  completed: { dot: "bg-emerald-400", label: "completed" },
  max_iterations: { dot: "bg-amber-400", label: "max iter" },
  error: { dot: "bg-red-400", label: "error" },
};

export function DebugTracePage() {
  const [traces, setTraces] = useState<TraceFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/traces/files")
      .then((r) => r.json())
      .then((data) => setTraces(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectTrace = async (traceId: string) => {
    setSelectedId(traceId);
    setLoadingEvents(true);
    try {
      const r = await fetch(`/api/traces/files/${traceId}`);
      const data = await r.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
      if (detailRef.current) detailRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* ─── Header ─── */}
      <header className="border-b border-white/[0.06] px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[11px] font-mono">back</span>
          </Link>
          <div className="w-px h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-400/80 to-violet-500/80 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M2 8h8M2 12h10"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="text-xs font-semibold tracking-tight text-gray-200 font-mono">
              Debug Trace Viewer
            </h1>
          </div>
        </div>
        <span className="text-[10px] text-gray-600 tabular-nums font-mono">
          {traces.length} trace{traces.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* ─── Master-detail ─── */}
      <main className="flex-1 flex min-h-0">
        {/* ─── Left: Trace list ─── */}
        <div className="w-[340px] shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-widest uppercase text-gray-500 font-mono">
              Sessions
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-white/[0.02] animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            ) : traces.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                <div className="relative mb-4 opacity-15">
                  {[28, 44, 36, 24].map((w, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full bg-gray-500 mb-1.5"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  No traces yet. Send a message in the main app to generate one.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {traces.map((t, i) => {
                  const active = t.traceId === selectedId;
                  const status = t.status
                    ? statusConfig[t.status]
                    : { dot: "bg-gray-600", label: "unknown" };

                  return (
                    <button
                      key={t.traceId}
                      onClick={() => selectTrace(t.traceId)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                        active
                          ? "bg-white/[0.06] ring-1 ring-white/[0.08]"
                          : "hover:bg-white/[0.03]"
                      }`}
                      style={{
                        animationName: "fadeSlideUp",
                        animationDuration: "0.25s",
                        animationTimingFunction: "ease-out",
                        animationFillMode: "backwards",
                        animationDelay: `${i * 30}ms`,
                      }}
                    >
                      {/* Row 1: ID + timestamp */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[11px] tabular-nums font-mono ${
                            active ? "text-cyan-300/90" : "text-gray-400"
                          }`}
                        >
                          {t.traceId.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-gray-600 tabular-nums font-mono">
                          {relativeTime(t.timestamp)}
                        </span>
                      </div>

                      {/* Row 2: User message */}
                      <div
                        className="text-[11px] text-gray-400 truncate mb-1.5 leading-snug"
                        title={t.userMessage}
                      >
                        {t.userMessage ?? "—"}
                      </div>

                      {/* Row 3: Meta chips */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                          />
                          <span className="text-[10px] text-gray-500 font-mono">
                            {status.label}
                          </span>
                        </div>
                        <span className="text-gray-800">·</span>
                        <span className="text-[10px] text-gray-500 tabular-nums font-mono">
                          {t.eventCount} evt
                        </span>
                        <span className="text-gray-800">·</span>
                        <span className="text-[10px] text-gray-500 tabular-nums font-mono">
                          {formatDuration(t.durationMs)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Trace detail ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedId ? (
            <>
              <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-gray-500 font-mono">
                    Trace
                  </span>
                  <span className="text-[11px] text-cyan-300/70 tabular-nums font-mono">
                    {selectedId.slice(0, 8)}
                  </span>
                </div>
                {!loadingEvents && (
                  <span className="text-[10px] text-gray-600 tabular-nums font-mono">
                    {events.length} events
                  </span>
                )}
              </div>

              <div
                ref={detailRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
              >
                {loadingEvents ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-xl bg-white/[0.02] animate-pulse"
                        style={{ animationDelay: `${i * 60}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  events.map((event) => (
                    <TraceCard key={event.eventId} event={event} />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
              <div className="relative mb-5 opacity-10">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                >
                  <rect
                    x="8"
                    y="6"
                    width="32"
                    height="36"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-gray-400"
                  />
                  <path
                    d="M16 16h16M16 22h12M16 28h14M16 34h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-gray-500"
                  />
                </svg>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed max-w-[200px] font-mono">
                Select a trace from the list to inspect its events
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
