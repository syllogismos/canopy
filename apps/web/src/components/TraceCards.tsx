import type { TraceEvent } from "@canopy/shared";

export function TraceCard({ event }: { event: TraceEvent }) {
  switch (event.type) {
    case "trace:start":
      return <StartCard event={event} />;
    case "trace:thinking":
      return <ThinkingCard event={event} />;
    case "trace:tool_call":
      return <ToolCallCard event={event} />;
    case "trace:tool_result":
      return <ToolResultCard event={event} />;
    case "trace:text":
      return <TextCard event={event} />;
    case "trace:error":
      return <ErrorCard event={event} />;
    case "trace:end":
      return <EndCard event={event} />;
    default:
      return null;
  }
}

/* ─── Individual trace cards ─── */

function StartCard({ event }: { event: Extract<TraceEvent, { type: "trace:start" }> }) {
  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] flex items-center gap-2 px-3 py-2 text-[11px] text-gray-500">
      <div className="w-1 h-1 rounded-full bg-gray-600" />
      <span className="font-mono">
        Agent run started
      </span>
      <span className="text-gray-700">·</span>
      <span className="text-gray-600">{event.model}</span>
    </div>
  );
}

function ThinkingCard({ event }: { event: Extract<TraceEvent, { type: "trace:thinking" }> }) {
  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] rounded-xl border border-violet-500/10 bg-violet-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Badge color="violet">THINKING</Badge>
        <IterationBadge iteration={event.iteration} />
      </div>
      <div className="px-3 pb-3 text-[11px] text-violet-200/70 leading-relaxed whitespace-pre-wrap break-words font-mono">
        {event.text}
      </div>
    </div>
  );
}

function ToolCallCard({ event }: { event: Extract<TraceEvent, { type: "trace:tool_call" }> }) {
  const isSearch = event.name === "google_search";

  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] rounded-xl border border-cyan-500/10 bg-cyan-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Badge color="cyan">{isSearch ? "SEARCHING" : event.name}</Badge>
        <IterationBadge iteration={event.iteration} />
      </div>
      <div className="px-3 pb-3">
        {isSearch && event.args.queries ? (
          <div className="flex flex-wrap gap-1.5">
            {(event.args.queries as string[]).map((q, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-[11px] text-cyan-300/80"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="opacity-50">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                  <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {q}
              </span>
            ))}
          </div>
        ) : (
          <pre className="text-[11px] text-cyan-200/60 leading-relaxed overflow-x-auto font-mono">
            {JSON.stringify(event.args, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function ToolResultCard({ event }: { event: Extract<TraceEvent, { type: "trace:tool_result" }> }) {
  const result = event.result as any;

  return (
    <div
      className={`animate-[fadeSlideUp_0.25s_ease-out] rounded-xl border overflow-hidden ${
        event.isError
          ? "border-red-500/10 bg-red-500/[0.04]"
          : "border-emerald-500/10 bg-emerald-500/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Badge color={event.isError ? "red" : "emerald"}>{event.isError ? "ERROR" : event.name}</Badge>
        {event.durationMs > 0 && (
          <span className="text-[10px] text-gray-500 tabular-nums font-mono">
            {event.durationMs}ms
          </span>
        )}
      </div>
      <div className="px-3 pb-3">
        {result?.type === "comparison" ? (
          <ComparisonTable data={result} />
        ) : result?.type === "checklist" ? (
          <Checklist data={result} />
        ) : result?.sources ? (
          <div className="space-y-2">
            {result.text && (
              <pre className="text-[11px] leading-relaxed text-emerald-200/60 font-mono whitespace-pre-wrap line-clamp-6">
                {result.text}
              </pre>
            )}
            <SourcesList sources={result.sources} />
          </div>
        ) : (
          <pre
            className={`text-[11px] leading-relaxed overflow-x-auto font-mono ${
              event.isError ? "text-red-300/70" : "text-emerald-200/60"
            }`}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function TextCard({ event }: { event: Extract<TraceEvent, { type: "trace:text" }> }) {
  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] rounded-xl border border-amber-500/10 bg-amber-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Badge color="amber">RESPONSE</Badge>
      </div>
      <div className="px-3 pb-3 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
        {event.text}
      </div>
    </div>
  );
}

function ErrorCard({ event }: { event: Extract<TraceEvent, { type: "trace:error" }> }) {
  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] rounded-xl border border-red-500/15 bg-red-500/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Badge color="red">ERROR</Badge>
      </div>
      <div className="px-3 pb-3 text-[11px] text-red-300/80 leading-relaxed font-mono">
        {event.message}
      </div>
    </div>
  );
}

function EndCard({ event }: { event: Extract<TraceEvent, { type: "trace:end" }> }) {
  const statusColors = {
    completed: "text-emerald-400/60",
    max_iterations: "text-amber-400/60",
    error: "text-red-400/60",
  };

  return (
    <div className="animate-[fadeSlideUp_0.25s_ease-out] flex items-center gap-2 px-3 py-2 text-[11px] text-gray-500 border-t border-white/[0.04] mt-1">
      <div className="w-1 h-1 rounded-full bg-gray-600" />
      <span className="font-mono">
        Completed in {event.totalIterations} {event.totalIterations === 1 ? "step" : "steps"}
      </span>
      <span className="text-gray-700">·</span>
      <span className="tabular-nums font-mono">
        {event.durationMs < 1000
          ? `${event.durationMs}ms`
          : `${(event.durationMs / 1000).toFixed(1)}s`}
      </span>
      <span className="text-gray-700">·</span>
      <span className={statusColors[event.status]}>{event.status}</span>
    </div>
  );
}

/* ─── Shared UI pieces ─── */

const colorMap: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-300/90",
  cyan: "bg-cyan-500/15 text-cyan-300/90",
  emerald: "bg-emerald-500/15 text-emerald-300/90",
  amber: "bg-amber-500/15 text-amber-300/90",
  red: "bg-red-500/15 text-red-300/90",
};

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase font-mono ${colorMap[color] ?? colorMap.cyan}`}
    >
      {children}
    </span>
  );
}

function IterationBadge({ iteration }: { iteration: number }) {
  return (
    <span className="text-[10px] text-gray-600 tabular-nums font-mono">
      #{iteration}
    </span>
  );
}

/* ─── Structured result renderers ─── */

export function ComparisonTable({ data }: { data: { title: string; columns: string[]; rows: string[][]; recommendation?: string } }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-emerald-200/80">{data.title}</div>
      <div className="overflow-x-auto rounded-lg border border-emerald-500/10">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-emerald-500/10">
              {data.columns.map((col, i) => (
                <th key={i} className="px-2.5 py-1.5 text-left text-emerald-300/60 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-emerald-500/[0.05] last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2.5 py-1.5 text-emerald-100/70 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.recommendation && (
        <div className="text-[11px] text-amber-300/70 px-2 py-1.5 rounded-md bg-amber-500/[0.06] border border-amber-500/10">
          {data.recommendation}
        </div>
      )}
    </div>
  );
}

export function Checklist({ data }: { data: { title: string; items: { step: string; details: string; required?: boolean }[] } }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-emerald-200/80">{data.title}</div>
      <div className="space-y-1">
        {data.items.map((item, i) => (
          <label key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-emerald-500/[0.04] cursor-pointer group">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-emerald-500/30 bg-transparent accent-emerald-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-emerald-200/80 flex items-center gap-1.5">
                {item.step}
                {item.required && (
                  <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-300/70">required</span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 leading-relaxed">{item.details}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function SourcesList({ sources }: { sources: (string | { title?: string; uri?: string })[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((source, i) => {
        const label = typeof source === "string" ? source : source.title || source.uri || "source";
        const href = typeof source === "string" ? undefined : source.uri;
        const Tag = href ? "a" : "span";
        return (
          <Tag
            key={i}
            {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] text-emerald-300/70 hover:bg-emerald-500/20 transition-colors"
          >
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none" className="opacity-40">
              <path d="M4 12l8-8M4 4h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {label}
          </Tag>
        );
      })}
    </div>
  );
}
