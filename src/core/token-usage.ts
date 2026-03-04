import type { TokenUsage } from "./types";

const INPUT_KEYS = ["inputtokens", "prompttokens"];
const OUTPUT_KEYS = ["outputtokens", "completiontokens"];
const CACHE_READ_KEYS = ["cachereadtokens"];
const CACHE_WRITE_KEYS = ["cachewritetokens"];
const TOTAL_KEYS = ["totaltokens"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTokenKey(rawKey: string): string {
  return rawKey.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

function toSafeTokenCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function collectNumericFields(value: unknown, fieldMap: Map<string, number[]>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNumericFields(item, fieldMap);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === "number") {
      const normalizedKey = normalizeTokenKey(key);
      const nextValues = fieldMap.get(normalizedKey) ?? [];

      nextValues.push(toSafeTokenCount(nestedValue));
      fieldMap.set(normalizedKey, nextValues);
      continue;
    }

    collectNumericFields(nestedValue, fieldMap);
  }
}

function pickFieldValue(fieldMap: Map<string, number[]>, candidates: string[]): number {
  for (const key of candidates) {
    const values = fieldMap.get(key);
    if (!values || values.length === 0) {
      continue;
    }

    return values[0] ?? 0;
  }

  return 0;
}

export function createEmptyTokenUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
  };
}

export function addTokenUsage(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
    cacheWriteTokens: left.cacheWriteTokens + right.cacheWriteTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

export function extractTokenUsage(payload: unknown): TokenUsage {
  const fieldMap = new Map<string, number[]>();
  collectNumericFields(payload, fieldMap);

  const inputTokens = pickFieldValue(fieldMap, INPUT_KEYS);
  const outputTokens = pickFieldValue(fieldMap, OUTPUT_KEYS);
  const cacheReadTokens = pickFieldValue(fieldMap, CACHE_READ_KEYS);
  const cacheWriteTokens = pickFieldValue(fieldMap, CACHE_WRITE_KEYS);
  const explicitTotalTokens = pickFieldValue(fieldMap, TOTAL_KEYS);

  const totalTokens =
    explicitTotalTokens > 0
      ? explicitTotalTokens
      : inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
  };
}
