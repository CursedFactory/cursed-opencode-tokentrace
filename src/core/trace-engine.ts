import { attributeSource } from "../attribution/source-attribution";
import { addTokenUsage, createEmptyTokenUsage, extractTokenUsage } from "./token-usage";
import type { SessionReport, SessionTotals, SourceReport, TraceEventInput } from "./types";

function toIsoString(value: Date | string): string {
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  return value.toISOString();
}

function mergeEvidence(existing: string[], incoming: string[], maxItems = 16): string[] {
  const merged = [...existing];

  for (const item of incoming) {
    if (merged.includes(item)) {
      continue;
    }

    merged.push(item);
    if (merged.length >= maxItems) {
      break;
    }
  }

  return merged;
}

export class TraceEngine {
  private readonly sessionId: string;
  private readonly startedAt: string;
  private updatedAt: string;
  private readonly totals: SessionTotals;
  private readonly sourceMap: Map<string, SourceReport>;
  private readonly notes: string[];

  constructor(sessionId: string, startedAt: Date = new Date()) {
    const startedIso = startedAt.toISOString();

    this.sessionId = sessionId;
    this.startedAt = startedIso;
    this.updatedAt = startedIso;
    this.totals = {
      ...createEmptyTokenUsage(),
      eventCount: 0,
    };
    this.sourceMap = new Map<string, SourceReport>();
    this.notes = [];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  addNote(note: string): void {
    const trimmed = note.trim();
    if (!trimmed || this.notes.includes(trimmed)) {
      return;
    }

    this.notes.push(trimmed);
  }

  recordEvent(eventInput: TraceEventInput): void {
    const timestamp = toIsoString(eventInput.timestamp ?? new Date());
    const tokenUsage = extractTokenUsage(eventInput.payload);
    const sourceAttribution = attributeSource(eventInput.eventName, eventInput.payload);

    this.updatedAt = timestamp;
    this.totals.eventCount += 1;
    this.totals.inputTokens += tokenUsage.inputTokens;
    this.totals.outputTokens += tokenUsage.outputTokens;
    this.totals.cacheReadTokens += tokenUsage.cacheReadTokens;
    this.totals.cacheWriteTokens += tokenUsage.cacheWriteTokens;
    this.totals.totalTokens += tokenUsage.totalTokens;

    const existingSource = this.sourceMap.get(sourceAttribution.key);
    if (existingSource) {
      existingSource.events += 1;
      existingSource.totals = addTokenUsage(existingSource.totals, tokenUsage);
      existingSource.evidence = mergeEvidence(existingSource.evidence, sourceAttribution.evidence);

      if (existingSource.confidence !== "direct" && sourceAttribution.confidence === "direct") {
        existingSource.confidence = "direct";
      }

      return;
    }

    this.sourceMap.set(sourceAttribution.key, {
      key: sourceAttribution.key,
      kind: sourceAttribution.kind,
      confidence: sourceAttribution.confidence,
      events: 1,
      totals: tokenUsage,
      evidence: sourceAttribution.evidence,
    });
  }

  snapshot(exportedAt?: string): SessionReport {
    const orderedSources = [...this.sourceMap.values()]
      .map((source) => ({
        ...source,
        totals: {
          ...source.totals,
        },
        evidence: [...source.evidence],
      }))
      .sort((left, right) => {
        if (left.totals.totalTokens !== right.totals.totalTokens) {
          return right.totals.totalTokens - left.totals.totalTokens;
        }

        if (left.events !== right.events) {
          return right.events - left.events;
        }

        return left.key.localeCompare(right.key);
      });

    const snapshot: SessionReport = {
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      totals: {
        ...this.totals,
      },
      sources: orderedSources,
      notes: [...this.notes],
    };

    if (exportedAt) {
      snapshot.exportedAt = exportedAt;
    }

    return snapshot;
  }
}
