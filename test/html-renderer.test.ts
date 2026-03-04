import { describe, expect, test } from "bun:test";

import { renderHtmlReport } from "../src/export/html-renderer";
import type { SessionReport } from "../src/core/types";

function buildReportWithUnknown(): SessionReport {
  return {
    sessionId: "session-html",
    startedAt: "2026-03-03T20:00:00.000Z",
    updatedAt: "2026-03-03T20:00:12.000Z",
    exportedAt: "2026-03-03T20:00:13.000Z",
    totals: {
      inputTokens: 200,
      outputTokens: 80,
      cacheReadTokens: 40,
      cacheWriteTokens: 10,
      totalTokens: 330,
      eventCount: 8,
    },
    sources: [
      {
        key: "mcp_tool:context7",
        kind: "mcp_tool",
        confidence: "direct",
        events: 4,
        totals: {
          inputTokens: 120,
          outputTokens: 40,
          cacheReadTokens: 20,
          cacheWriteTokens: 4,
          totalTokens: 184,
        },
        evidence: ["direct:mcp:mcpServer"],
      },
      {
        key: "unknown:unknown",
        kind: "unknown",
        confidence: "inferred",
        events: 2,
        totals: {
          inputTokens: 80,
          outputTokens: 40,
          cacheReadTokens: 20,
          cacheWriteTokens: 6,
          totalTokens: 146,
        },
        evidence: ["unknown:event:tool.execute.after"],
      },
    ],
    notes: [],
  };
}

describe("renderHtmlReport", () => {
  test("renders an HTML document with table and unknown details", () => {
    const htmlReport = renderHtmlReport(buildReportWithUnknown());

    expect(htmlReport.includes("<!DOCTYPE html>")).toBe(true);
    expect(htmlReport.includes('id="source-table"')).toBe(true);
    expect(htmlReport.includes('class="unknown-row"')).toBe(true);
    expect(htmlReport.includes("Unknown Sources (1)")).toBe(true);
    expect(htmlReport.includes('id="unknown-detail"')).toBe(true);
  });

  test("supports theme and title overrides", () => {
    const htmlReport = renderHtmlReport(buildReportWithUnknown(), {
      title: "Custom Title",
      darkMode: "light",
    });

    expect(htmlReport.includes("Custom Title")).toBe(true);
    expect(htmlReport.includes("theme-light")).toBe(true);
  });
});
