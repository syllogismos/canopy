import { mkdir, readdir, readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { TraceEvent, TraceFileMeta } from "@canopy/shared";

const TRACES_DIR = join(import.meta.dir, "../../traces");

/** Ensure the traces directory exists on startup */
export async function ensureTracesDir(): Promise<void> {
  await mkdir(TRACES_DIR, { recursive: true });
}

/** Build filename from traceId and timestamp */
function filename(traceId: string, timestamp: number): string {
  return `${traceId}_${timestamp}.jsonl`;
}

/** Map of traceId → filename (populated lazily) */
const traceFileMap = new Map<string, string>();

/** Append one trace event as a JSON line to the session's file */
export async function appendTraceEvent(event: TraceEvent): Promise<void> {
  let fname = traceFileMap.get(event.traceId);
  if (!fname) {
    fname = filename(event.traceId, event.timestamp);
    traceFileMap.set(event.traceId, fname);
  }
  const line = JSON.stringify(event) + "\n";
  await appendFile(join(TRACES_DIR, fname), line);
}

/** List all trace files with metadata parsed from first/last lines */
export async function listTraceFiles(): Promise<TraceFileMeta[]> {
  const files = await readdir(TRACES_DIR);
  const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort().reverse();

  const results: TraceFileMeta[] = [];

  for (const file of jsonlFiles) {
    try {
      const content = await readFile(join(TRACES_DIR, file), "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      if (lines.length === 0) continue;

      const first: TraceEvent = JSON.parse(lines[0]);
      const last: TraceEvent = JSON.parse(lines[lines.length - 1]);

      const meta: TraceFileMeta = {
        filename: file,
        traceId: first.traceId,
        timestamp: first.timestamp,
        eventCount: lines.length,
      };

      if (first.type === "trace:start") {
        meta.userMessage = first.userMessage;
      }

      if (last.type === "trace:end") {
        meta.status = last.status;
        meta.durationMs = last.durationMs;
      }

      results.push(meta);
    } catch {
      // skip corrupt files
    }
  }

  return results;
}

/** Read all events from a trace file by traceId prefix */
export async function readTraceFile(
  traceId: string
): Promise<TraceEvent[] | null> {
  const files = await readdir(TRACES_DIR);
  const match = files.find((f) => f.startsWith(traceId));
  if (!match) return null;

  const content = await readFile(join(TRACES_DIR, match), "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line) as TraceEvent);
}
