import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { createTokenTracePlugin } from "../src/plugin/tokentrace-plugin";

async function runHook(
  plugin: ReturnType<typeof createTokenTracePlugin>,
  hookName: string,
  payload: unknown,
): Promise<void> {
  const hook = plugin.hooks[hookName];
  if (!hook) {
    throw new Error(`Hook not found: ${hookName}`);
  }

  await hook(payload);
}

describe("createTokenTracePlugin", () => {
  test("auto-exports report on session idle", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "tokentrace-plugin-"));
    let tick = 0;

    try {
      const plugin = createTokenTracePlugin({
        outputDir: tempDir,
        autoExportOnIdle: true,
        includeMarkdown: false,
        now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
      });

      await runHook(plugin, "tool.execute.after", {
        sessionId: "session-1",
        tool: {
          type: "plugin",
          name: "context-search",
        },
        usage: {
          input_tokens: 7,
          output_tokens: 3,
        },
      });

      await runHook(plugin, "session.idle", {
        sessionId: "session-1",
      });

      const files = await readdir(tempDir);
      expect(files.length).toBe(2);
      const jsonFile = files.find((fileName) => fileName.endsWith(".json"));
      expect(jsonFile).toBeDefined();

      const reportPath = path.join(tempDir, jsonFile as string);
      const reportBody = await readFile(reportPath, "utf8");
      const report = JSON.parse(reportBody) as { sessionId: string; totals: { totalTokens: number } };

      expect(report.sessionId).toBe("session-1");
      expect(report.totals.totalTokens).toBe(10);
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });

  test("supports manual export and report lookup", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "tokentrace-plugin-manual-"));

    try {
      const plugin = createTokenTracePlugin({
        outputDir: tempDir,
        autoExportOnIdle: false,
      });

      await runHook(plugin, "command.executed", {
        session: {
          id: "session-manual",
        },
        command: {
          name: "trace-report",
        },
        usage: {
          prompt_tokens: 4,
          completion_tokens: 6,
        },
      });

      const snapshot = plugin.getSessionReport("session-manual");
      expect(snapshot?.totals.totalTokens).toBe(10);

      const exportResult = await plugin.exportSession("session-manual");
      expect(exportResult?.jsonPath.endsWith(".json")).toBe(true);
      expect(exportResult?.ansiPath?.endsWith(".ansi.txt")).toBe(true);

      const unknownExport = await plugin.exportSession("missing-session");
      expect(unknownExport).toBeNull();
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });
});
