import type { TraceEvent } from "@canopy/shared";

/** Create a trace event with auto-generated eventId and timestamp */
export function createTraceEvent<T extends TraceEvent>(
  base: Omit<T, "eventId" | "timestamp"> & { type: T["type"] }
): T {
  return {
    ...base,
    eventId: crypto.randomUUID(),
    timestamp: Date.now(),
  } as T;
}

/** In-memory store for recent trace runs (last 100) */
export class TraceStore {
  private runs = new Map<string, TraceEvent[]>();
  private order: string[] = [];
  private maxRuns = 100;

  add(event: TraceEvent) {
    const { traceId } = event;
    if (!this.runs.has(traceId)) {
      this.runs.set(traceId, []);
      this.order.push(traceId);
      // Evict oldest if over limit
      if (this.order.length > this.maxRuns) {
        const oldest = this.order.shift()!;
        this.runs.delete(oldest);
      }
    }
    this.runs.get(traceId)!.push(event);
  }

  get(traceId: string): TraceEvent[] | undefined {
    return this.runs.get(traceId);
  }

  list(): { traceId: string; eventCount: number; startedAt: number }[] {
    return this.order.map((traceId) => {
      const events = this.runs.get(traceId)!;
      return {
        traceId,
        eventCount: events.length,
        startedAt: events[0]?.timestamp ?? 0,
      };
    }).reverse();
  }
}

export const traceStore = new TraceStore();
