import { describe, expect, test } from "bun:test";

import { attributeSource } from "../src/attribution/source-attribution";

describe("attributeSource", () => {
  test("detects direct skill attribution", () => {
    const result = attributeSource("tool.execute.after", {
      skill: {
        id: "issue-map",
      },
    });

    expect(result.kind).toBe("skill");
    expect(result.confidence).toBe("direct");
    expect(result.key).toBe("skill:issue-map");
  });

  test("detects direct mcp tool attribution", () => {
    const result = attributeSource("tool.execute.after", {
      tool: {
        type: "mcp",
        name: "context7.search",
      },
      mcpServer: "context7",
    });

    expect(result.kind).toBe("mcp_tool");
    expect(result.confidence).toBe("direct");
    expect(result.key).toBe("mcp_tool:context7");
  });

  test("infers command source from event name", () => {
    const result = attributeSource("command.executed", {
      args: ["--verbose"],
    });

    expect(result.kind).toBe("command");
    expect(result.confidence).toBe("inferred");
  });

  test("falls back to unknown when no evidence is available", () => {
    const result = attributeSource("custom.random.event", {
      foo: "bar",
    });

    expect(result.kind).toBe("unknown");
    expect(result.key).toBe("unknown:unknown");
    expect(result.evidence.length).toBeGreaterThan(0);
  });
});
