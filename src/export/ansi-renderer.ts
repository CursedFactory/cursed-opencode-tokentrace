import type { SessionReport } from "../core/types";
import {
  buildTextBar,
  computeConfidenceBuckets,
  computeSourceSegments,
  formatInteger,
  formatPercent,
  sortSourcesByTotal,
  truncateLabel,
} from "./chart-helpers";

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  gray: "\u001b[90m",
} as const;

export interface AnsiRenderOptions {
  barWidth?: number;
  colorEnabled?: boolean;
  maxSources?: number;
}

function colorize(value: string, styles: string[], enabled: boolean): string {
  if (!enabled) {
    return value;
  }

  return `${styles.join("")}${value}${ANSI.reset}`;
}

function padNumber(value: number, width: number): string {
  return formatInteger(value).padStart(width, " ");
}

function buildCompositionBar(input: number, output: number, cache: number, width: number): string {
  const total = Math.max(0, input + output + cache);
  if (total === 0) {
    return "░".repeat(width);
  }

  const rawCounts = [input, output, cache].map((value) => (value / total) * width);
  const counts = rawCounts.map((value) => Math.floor(value));
  let remainder = width - counts.reduce((sum, value) => sum + value, 0);

  while (remainder > 0) {
    let bestIndex = 0;
    let bestFraction = -1;

    for (let index = 0; index < rawCounts.length; index += 1) {
      const fraction = rawCounts[index] - counts[index];
      if (fraction > bestFraction) {
        bestFraction = fraction;
        bestIndex = index;
      }
    }

    counts[bestIndex] += 1;
    remainder -= 1;
  }

  return [
    "█".repeat(Math.max(0, counts[0])),
    "▓".repeat(Math.max(0, counts[1])),
    "▒".repeat(Math.max(0, counts[2])),
  ].join("");
}

export function renderAnsiReport(report: SessionReport, options: AnsiRenderOptions = {}): string {
  const barWidth = options.barWidth ?? 22;
  const colorEnabled = options.colorEnabled ?? true;
  const maxSources = options.maxSources ?? 12;
  const segments = computeSourceSegments(report).slice(0, maxSources);
  const sortedSources = sortSourcesByTotal(report.sources).slice(0, maxSources);
  const unknownSources = sortSourcesByTotal(report.sources).filter((source) => source.kind === "unknown");
  const confidenceBuckets = computeConfidenceBuckets(report);
  const title = `Token Trace Report | ${report.sessionId}`;
  const divider = "-".repeat(86);
  const lines: string[] = [];

  lines.push(colorize(title, [ANSI.bold, ANSI.cyan], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));
  lines.push(`Started:  ${report.startedAt}`);
  lines.push(`Updated:  ${report.updatedAt}`);
  lines.push(`Exported: ${report.exportedAt ?? "n/a"}`);
  lines.push("");

  lines.push(colorize("Totals", [ANSI.bold], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));
  lines.push(
    `Input ${padNumber(report.totals.inputTokens, 10)}   Output ${padNumber(report.totals.outputTokens, 10)}   Events ${padNumber(report.totals.eventCount, 6)}`,
  );
  lines.push(
    `CacheR${padNumber(report.totals.cacheReadTokens, 9)}   CacheW ${padNumber(report.totals.cacheWriteTokens, 9)}   Total ${padNumber(report.totals.totalTokens, 7)}`,
  );
  lines.push("");

  lines.push(colorize("Sources By Token Share", [ANSI.bold], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));

  if (segments.length === 0) {
    lines.push("No source entries recorded.");
  }

  for (const segment of segments) {
    const baseLabel = segment.isUnknown ? `⚠ ${segment.key}` : segment.key;
    const keyLabel = truncateLabel(baseLabel, 34).padEnd(34, " ");
    const bar = buildTextBar(segment.share, barWidth);
    const coloredBar = segment.isUnknown
      ? colorize(bar, [ANSI.yellow], colorEnabled)
      : colorize(bar, [ANSI.green], colorEnabled);
    const confidence =
      segment.confidence === "direct"
        ? colorize("direct", [ANSI.green], colorEnabled)
        : colorize("inferred", [ANSI.yellow], colorEnabled);

    lines.push(
      `${coloredBar}  ${keyLabel}  ${padNumber(segment.value, 8)}  ${formatPercent(segment.share).padStart(6, " ")}  ${confidence}`,
    );
  }

  lines.push("");
  lines.push(colorize("Token Composition", [ANSI.bold], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));
  lines.push(colorize("Legend: █ input  ▓ output  ▒ cache", [ANSI.dim], colorEnabled));

  for (const source of sortedSources.slice(0, 6)) {
    const cacheTotal = source.totals.cacheReadTokens + source.totals.cacheWriteTokens;
    const composition = buildCompositionBar(
      source.totals.inputTokens,
      source.totals.outputTokens,
      cacheTotal,
      barWidth,
    );
    const label = truncateLabel(source.key, 26).padEnd(26, " ");

    lines.push(`${label}  ${composition}`);
  }

  lines.push("");
  lines.push(colorize("Attribution Confidence", [ANSI.bold], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));

  for (const bucket of confidenceBuckets) {
    const label = bucket.confidence.padEnd(8, " ");
    const confidenceLine = `${label}  ${String(bucket.sourceCount).padStart(2, " ")} source(s)  ${padNumber(bucket.totalTokens, 8)} tokens  ${formatPercent(bucket.share).padStart(6, " ")}`;

    lines.push(
      bucket.confidence === "direct"
        ? colorize(confidenceLine, [ANSI.green], colorEnabled)
        : colorize(confidenceLine, [ANSI.yellow], colorEnabled),
    );
  }

  lines.push("");
  if (unknownSources.length > 0) {
    const unknownTokens = unknownSources.reduce((sum, source) => sum + source.totals.totalTokens, 0);
    const unknownShare = report.totals.totalTokens > 0 ? unknownTokens / report.totals.totalTokens : 0;

    lines.push(colorize("⚠ Unknown Sources", [ANSI.bold, ANSI.yellow], colorEnabled));
    lines.push(colorize(divider, [ANSI.gray], colorEnabled));
    lines.push(
      `${unknownSources.length} source(s), ${formatInteger(unknownTokens)} tokens, ${formatPercent(unknownShare)} of total`,
    );

    for (const source of unknownSources) {
      lines.push(`- ${source.key}`);
      for (const evidence of source.evidence.slice(0, 5)) {
        lines.push(colorize(`  · ${evidence}`, [ANSI.dim], colorEnabled));
      }
    }
  } else {
    lines.push(colorize("✓ All sources attributed (no unknown entries)", [ANSI.green], colorEnabled));
  }

  lines.push("");
  lines.push(colorize("Notes", [ANSI.bold], colorEnabled));
  lines.push(colorize(divider, [ANSI.gray], colorEnabled));

  if (report.notes.length === 0) {
    lines.push(colorize("- none", [ANSI.dim], colorEnabled));
  } else {
    for (const note of report.notes) {
      lines.push(`- ${note}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
