import { describe, expect, test } from "bun:test";

import { TraceEngine } from "../src/core/trace-engine";

describe("TraceEngine", () => {
  test("aggregates usage by session and source", () => {
    const engine = new TraceEngine("session-1", new Date("2026-01-01T00:00:00.000Z"));

    engine.recordEvent({
      eventName: "tool.execute.after",
      timestamp: "2026-01-01T00:00:01.000Z",
      payload: {
        sessionId: "session-1",
        tool: {
          type: "plugin",
          name: "search-docs",
        },
        usage: {
          input_tokens: 10,
          output_tokens: 4,
        },
      },
    });

    engine.recordEvent({
      eventName: "tool.execute.before",
      timestamp: "2026-01-01T00:00:02.000Z",
      payload: {
        sessionId: "session-1",
        toolName: "search-docs",
        usage: {
          prompt_tokens: 5,
          completion_tokens: 1,
        },
      },
    });

    const snapshot = engine.snapshot();
    const pluginSource = snapshot.sources.find((source) => source.key === "plugin_tool:search-docs");

    expect(snapshot.sessionId).toBe("session-1");
    expect(snapshot.totals.eventCount).toBe(2);
    expect(snapshot.totals.inputTokens).toBe(15);
    expect(snapshot.totals.outputTokens).toBe(5);
    expect(snapshot.totals.totalTokens).toBe(20);
    expect(pluginSource?.events).toBe(2);
    expect(pluginSource?.confidence).toBe("direct");
    expect(snapshot.updatedAt).toBe("2026-01-01T00:00:02.000Z");
  });

  test("tracks unknown attribution safely", () => {
    const engine = new TraceEngine("session-2");

    engine.recordEvent({
      eventName: "opaque.event",
      payload: {
        data: {
          value: "none",
        },
      },
    });

    const snapshot = engine.snapshot();

    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.sources[0]?.kind).toBe("unknown");
    expect(snapshot.sources[0]?.key).toBe("unknown:unknown");
  });
});
