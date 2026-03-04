import { describe, expect, test } from "bun:test";

import { renderAnsiReport } from "../src/export/ansi-renderer";
import type { SessionReport } from "../src/core/types";

function buildReportWithUnknown(): SessionReport {
  return {
    sessionId: "session-ansi",
    startedAt: "2026-03-03T20:00:00.000Z",
    updatedAt: "2026-03-03T20:00:12.000Z",
    exportedAt: "2026-03-03T20:00:13.000Z",
    totals: {
      inputTokens: 120,
      outputTokens: 60,
      cacheReadTokens: 20,
      cacheWriteTokens: 4,
      totalTokens: 204,
      eventCount: 6,
    },
    sources: [
      {
        key: "skill:issue-map",
        kind: "skill",
        confidence: "direct",
        events: 3,
        totals: {
          inputTokens: 80,
          outputTokens: 30,
          cacheReadTokens: 10,
          cacheWriteTokens: 2,
          totalTokens: 122,
        },
        evidence: ["direct:skill:skill.id"],
      },
      {
        key: "unknown:unknown",
        kind: "unknown",
        confidence: "inferred",
        events: 1,
        totals: {
          inputTokens: 40,
          outputTokens: 30,
          cacheReadTokens: 10,
          cacheWriteTokens: 2,
          totalTokens: 82,
        },
        evidence: ["unknown:event:custom", "unknown:insufficient-source-evidence"],
      },
    ],
    notes: ["unknown retained for conservative accounting"],
  };
}

describe("renderAnsiReport", () => {
  test("renders sections and unknown callout without ANSI colors when disabled", () => {
    const report = renderAnsiReport(buildReportWithUnknown(), {
      colorEnabled: false,
      barWidth: 12,
    });

    expect(report.includes("Token Trace Report | session-ansi")).toBe(true);
    expect(report.includes("Sources By Token Share")).toBe(true);
    expect(report.includes("⚠ Unknown Sources")).toBe(true);
    expect(report.includes("unknown:unknown")).toBe(true);
    expect(report.includes("\u001b[")).toBe(false);
  });

  test("renders attributed summary when unknown is absent", () => {
    const input = buildReportWithUnknown();
    input.sources = [input.sources[0] as SessionReport["sources"][number]];
    input.totals.totalTokens = 122;

    const report = renderAnsiReport(input, {
      colorEnabled: false,
    });

    expect(report.includes("✓ All sources attributed")).toBe(true);
  });
});
