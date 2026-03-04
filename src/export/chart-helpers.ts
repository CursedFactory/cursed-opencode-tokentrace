import type { AttributionConfidence, SessionReport, SourceKind, SourceReport } from "../core/types";

export interface BarSegment {
  key: string;
  kind: SourceKind;
  confidence: AttributionConfidence;
  value: number;
  share: number;
  isUnknown: boolean;
}

export interface ConfidenceBucket {
  confidence: AttributionConfidence;
  sourceCount: number;
  totalTokens: number;
  share: number;
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.trunc(value)));
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

export function computeSourceSegments(report: SessionReport): BarSegment[] {
  const totalTokens = Math.max(0, report.totals.totalTokens);
  const normalizedSources = [...report.sources].sort(
    (left, right) => right.totals.totalTokens - left.totals.totalTokens,
  );

  return normalizedSources.map((source) => ({
    key: source.key,
    kind: source.kind,
    confidence: source.confidence,
    value: source.totals.totalTokens,
    share: safeDivide(source.totals.totalTokens, totalTokens),
    isUnknown: source.kind === "unknown",
  }));
}

export function computeConfidenceBuckets(report: SessionReport): ConfidenceBucket[] {
  const totalTokens = Math.max(0, report.totals.totalTokens);
  const seed: Record<AttributionConfidence, ConfidenceBucket> = {
    direct: {
      confidence: "direct",
      sourceCount: 0,
      totalTokens: 0,
      share: 0,
    },
    inferred: {
      confidence: "inferred",
      sourceCount: 0,
      totalTokens: 0,
      share: 0,
    },
  };

  for (const source of report.sources) {
    const bucket = seed[source.confidence];
    bucket.sourceCount += 1;
    bucket.totalTokens += source.totals.totalTokens;
  }

  seed.direct.share = safeDivide(seed.direct.totalTokens, totalTokens);
  seed.inferred.share = safeDivide(seed.inferred.totalTokens, totalTokens);

  return [seed.direct, seed.inferred];
}

export function buildTextBar(
  share: number,
  width: number,
  filledChar = "█",
  emptyChar = "░",
): string {
  const safeWidth = Math.max(1, Math.trunc(width));
  const safeShare = Math.min(1, Math.max(0, share));
  const filledWidth = Math.round(safeShare * safeWidth);

  return `${filledChar.repeat(filledWidth)}${emptyChar.repeat(Math.max(0, safeWidth - filledWidth))}`;
}

export function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }

  if (maxLength <= 3) {
    return label.slice(0, maxLength);
  }

  return `${label.slice(0, maxLength - 3)}...`;
}

export function sortSourcesByTotal(sources: SourceReport[]): SourceReport[] {
  return [...sources].sort((left, right) => {
    if (left.totals.totalTokens !== right.totals.totalTokens) {
      return right.totals.totalTokens - left.totals.totalTokens;
    }

    return left.key.localeCompare(right.key);
  });
}
