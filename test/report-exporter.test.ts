import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { exportSessionReport } from "../src/export/report-exporter";
import type { SessionReport } from "../src/core/types";

function buildBaseReport(): SessionReport {
  return {
    sessionId: "session-1",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    totals: {
      inputTokens: 10,
      outputTokens: 4,
      cacheReadTokens: 1,
      cacheWriteTokens: 0,
      totalTokens: 15,
      eventCount: 2,
    },
    sources: [
      {
        key: "command:build",
        kind: "command",
        confidence: "direct",
        events: 1,
        totals: {
          inputTokens: 10,
          outputTokens: 4,
          cacheReadTokens: 1,
          cacheWriteTokens: 0,
          totalTokens: 15,
        },
        evidence: ["direct:command:command.name"],
      },
    ],
    notes: [],
  };
}

describe("exportSessionReport", () => {
  test("writes JSON, ANSI, HTML, and markdown files", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "tokentrace-export-"));

    try {
      const result = await exportSessionReport(buildBaseReport(), {
        outputDir: tempDir,
        includeHtml: true,
        includeMarkdown: true,
        exportedAt: "2026-01-01T00:02:00.000Z",
      });

      const jsonBody = await readFile(result.jsonPath, "utf8");
      const ansiBody = await readFile(result.ansiPath as string, "utf8");
      const htmlBody = await readFile(result.htmlPath as string, "utf8");
      const markdownBody = await readFile(result.markdownPath as string, "utf8");
      const parsed = JSON.parse(jsonBody) as SessionReport;

      expect(result.jsonPath.endsWith(".json")).toBe(true);
      expect(result.ansiPath?.endsWith(".ansi.txt")).toBe(true);
      expect(result.htmlPath?.endsWith(".html")).toBe(true);
      expect(result.markdownPath?.endsWith(".md")).toBe(true);
      expect(parsed.exportedAt).toBe("2026-01-01T00:02:00.000Z");
      expect(ansiBody.includes("Token Trace Report")).toBe(true);
      expect(htmlBody.includes("<!DOCTYPE html>")).toBe(true);
      expect(markdownBody.includes("| Kind | Key | Confidence |")).toBe(true);
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });

  test("creates the output directory when it does not exist", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "tokentrace-export-nested-"));
    const outputDir = path.join(rootDir, "nested", "reports");

    try {
      const result = await exportSessionReport(buildBaseReport(), {
        outputDir,
      });

      const jsonBody = await readFile(result.jsonPath, "utf8");
      const parsed = JSON.parse(jsonBody) as SessionReport;

      expect(parsed.sessionId).toBe("session-1");
      expect(result.ansiPath?.endsWith(".ansi.txt")).toBe(true);
      expect(result.markdownPath).toBeUndefined();
      expect(result.htmlPath).toBeUndefined();
    } finally {
      await rm(rootDir, {
        recursive: true,
        force: true,
      });
    }
  });
});
