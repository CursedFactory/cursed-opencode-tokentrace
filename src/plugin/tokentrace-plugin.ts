import { TraceEngine } from "../core/trace-engine";
import { UNKNOWN_SESSION_ID } from "../core/types";
import { exportSessionReport } from "../export/report-exporter";
import type { SessionReport } from "../core/types";
import type { ExportSessionReportOptions } from "../export/report-exporter";
import type { ExportResult } from "../export/report-exporter";

export interface TokenTracePluginOptions {
  outputDir?: string;
  includeMarkdown?: boolean;
  autoExportOnIdle?: boolean;
  now?: () => Date;
}

export type HookHandler = (payload: unknown) => Promise<void>;

export interface TokenTracePlugin {
  name: string;
  hooks: Record<string, HookHandler>;
  exportSession: (sessionId: string) => Promise<ExportResult | null>;
  getSessionReport: (sessionId: string) => SessionReport | null;
  getKnownSessionIds: () => string[];
}

const DEFAULT_HOOKS = [
  "tool.execute.before",
  "tool.execute.after",
  "command.executed",
  "message.updated",
  "message.part.updated",
  "session.idle",
] as const;

type Path = readonly string[];

const SESSION_ID_PATHS: Path[] = [
  ["sessionId"],
  ["session", "id"],
  ["context", "sessionId"],
  ["metadata", "sessionId"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPathValue(value: unknown, path: Path): unknown {
  let cursor: unknown = value;

  for (const segment of path) {
    if (!isRecord(cursor)) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
}

function readSessionId(payload: unknown): string {
  for (const path of SESSION_ID_PATHS) {
    const nestedValue = readPathValue(payload, path);
    if (typeof nestedValue !== "string" || nestedValue.trim().length === 0) {
      continue;
    }

    return nestedValue.trim();
  }

  return UNKNOWN_SESSION_ID;
}

export function createTokenTracePlugin(options: TokenTracePluginOptions = {}): TokenTracePlugin {
  const now = options.now ?? (() => new Date());
  const sessionMap = new Map<string, TraceEngine>();

  const getOrCreateSession = (sessionId: string): TraceEngine => {
    const existingSession = sessionMap.get(sessionId);
    if (existingSession) {
      return existingSession;
    }

    const nextSession = new TraceEngine(sessionId, now());
    sessionMap.set(sessionId, nextSession);
    return nextSession;
  };

  const recordEvent = (eventName: string, payload: unknown): string => {
    const sessionId = readSessionId(payload);
    const session = getOrCreateSession(sessionId);

    session.recordEvent({
      eventName,
      payload,
      timestamp: now(),
    });

    return sessionId;
  };

  const exportBySessionId = async (sessionId: string): Promise<ExportResult | null> => {
    const session = sessionMap.get(sessionId);
    if (!session) {
      return null;
    }

    const exportedAt = now().toISOString();
    const report = session.snapshot(exportedAt);
    const exportOptions: ExportSessionReportOptions = {
      exportedAt,
    };

    if (options.outputDir) {
      exportOptions.outputDir = options.outputDir;
    }

    if (options.includeMarkdown !== undefined) {
      exportOptions.includeMarkdown = options.includeMarkdown;
    }

    return exportSessionReport(report, exportOptions);
  };

  const hooks: Record<string, HookHandler> = {};

  for (const hookName of DEFAULT_HOOKS) {
    hooks[hookName] = async (payload: unknown): Promise<void> => {
      const sessionId = recordEvent(hookName, payload);

      if (hookName === "session.idle" && options.autoExportOnIdle) {
        await exportBySessionId(sessionId);
      }
    };
  }

  return {
    name: "cursed-opencode-tokentrace",
    hooks,
    exportSession: exportBySessionId,
    getSessionReport: (sessionId: string): SessionReport | null => {
      return sessionMap.get(sessionId)?.snapshot() ?? null;
    },
    getKnownSessionIds: (): string[] => {
      return [...sessionMap.keys()].sort();
    },
  };
}

export default function tokentracePlugin(
  _context?: unknown,
  options: TokenTracePluginOptions = {},
): TokenTracePlugin {
  return createTokenTracePlugin(options);
}
