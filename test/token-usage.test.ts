import { describe, expect, test } from "bun:test";

import { extractTokenUsage } from "../src/core/token-usage";

describe("extractTokenUsage", () => {
  test("extracts snake_case usage fields", () => {
    const usage = extractTokenUsage({
      usage: {
        input_tokens: 11,
        output_tokens: 7,
        cache_read_tokens: 3,
        cache_write_tokens: 2,
        total_tokens: 23,
      },
    });

    expect(usage).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      cacheReadTokens: 3,
      cacheWriteTokens: 2,
      totalTokens: 23,
    });
  });

  test("extracts mixed naming conventions and computes total when missing", () => {
    const usage = extractTokenUsage({
      tokenUsage: {
        promptTokens: 8,
        completion_tokens: 5,
        cacheReadTokens: 1,
      },
    });

    expect(usage).toEqual({
      inputTokens: 8,
      outputTokens: 5,
      cacheReadTokens: 1,
      cacheWriteTokens: 0,
      totalTokens: 14,
    });
  });

  test("returns zero usage when payload does not contain token fields", () => {
    const usage = extractTokenUsage({
      foo: "bar",
      nested: {
        count: 10,
      },
    });

    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
    });
  });

  test("clamps non-finite and negative numbers", () => {
    const usage = extractTokenUsage({
      usage: {
        input_tokens: -5,
        output_tokens: Number.NaN,
        total_tokens: Number.POSITIVE_INFINITY,
      },
    });

    expect(usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
    });
  });
});
