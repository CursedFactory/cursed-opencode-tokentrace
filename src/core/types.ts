export type SourceKind =
  | "skill"
  | "plugin_tool"
  | "mcp_tool"
  | "command"
  | "message"
  | "session"
  | "unknown";

export type AttributionConfidence = "direct" | "inferred";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

export interface SourceAttribution {
  key: string;
  kind: SourceKind;
  sourceId: string;
  confidence: AttributionConfidence;
  evidence: string[];
}

export interface SourceReport {
  key: string;
  kind: SourceKind;
  confidence: AttributionConfidence;
  events: number;
  totals: TokenUsage;
  evidence: string[];
}

export interface SessionTotals extends TokenUsage {
  eventCount: number;
}

export interface SessionReport {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  exportedAt?: string;
  totals: SessionTotals;
  sources: SourceReport[];
  notes: string[];
}

export interface TraceEventInput {
  eventName: string;
  payload?: unknown;
  timestamp?: Date | string;
}

export const UNKNOWN_SOURCE_ID = "unknown";
export const UNKNOWN_SESSION_ID = "unknown-session";
