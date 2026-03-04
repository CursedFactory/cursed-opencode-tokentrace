import { UNKNOWN_SOURCE_ID } from "../core/types";
import type { AttributionConfidence, SourceAttribution, SourceKind } from "../core/types";

type Path = readonly string[];

const SKILL_PATHS: Path[] = [["skillId"], ["skillName"], ["skill", "id"], ["skill", "name"]];
const COMMAND_PATHS: Path[] = [
  ["commandId"],
  ["commandName"],
  ["command", "id"],
  ["command", "name"],
];
const MESSAGE_PATHS: Path[] = [["messageId"], ["message", "id"], ["part", "id"]];
const SESSION_PATHS: Path[] = [["sessionId"], ["session", "id"]];
const TOOL_TYPE_PATHS: Path[] = [["toolType"], ["tool", "type"]];
const TOOL_NAME_PATHS: Path[] = [["toolName"], ["tool", "name"]];
const PLUGIN_ID_PATHS: Path[] = [["pluginId"], ["plugin", "id"], ["tool", "pluginId"]];
const MCP_ID_PATHS: Path[] = [
  ["mcpTool"],
  ["mcpToolName"],
  ["mcp", "tool"],
  ["mcp", "server"],
  ["mcpServer"],
  ["tool", "server"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeSourceId(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return UNKNOWN_SOURCE_ID;
  }

  return trimmed.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._:-]/g, "_");
}

function readPathValue(value: unknown, path: Path): unknown {
  let cursor: unknown = value;

  for (const segment of path) {
    if (!isRecord(cursor)) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
}

function readFirstString(value: unknown, paths: Path[]): { value: string; path: string } | null {
  for (const path of paths) {
    const nestedValue = readPathValue(value, path);
    if (typeof nestedValue !== "string" || nestedValue.trim().length === 0) {
      continue;
    }

    return {
      value: nestedValue,
      path: path.join("."),
    };
  }

  return null;
}

function payloadContainsKeyword(value: unknown, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();

  if (typeof value === "string") {
    return value.toLowerCase().includes(normalizedKeyword);
  }

  if (Array.isArray(value)) {
    return value.some((item) => payloadContainsKeyword(item, normalizedKeyword));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      key.toLowerCase().includes(normalizedKeyword) ||
      payloadContainsKeyword(nestedValue, normalizedKeyword),
  );
}

function buildAttribution(
  kind: SourceKind,
  sourceId: string,
  confidence: AttributionConfidence,
  evidence: string[],
): SourceAttribution {
  const safeSourceId = sanitizeSourceId(sourceId);

  return {
    key: `${kind}:${safeSourceId}`,
    kind,
    sourceId: safeSourceId,
    confidence,
    evidence,
  };
}

function detectToolAttribution(payload: unknown): SourceAttribution | null {
  const toolTypeMatch = readFirstString(payload, TOOL_TYPE_PATHS);
  const toolNameMatch = readFirstString(payload, TOOL_NAME_PATHS);
  const pluginIdMatch = readFirstString(payload, PLUGIN_ID_PATHS);
  const mcpIdMatch = readFirstString(payload, MCP_ID_PATHS);

  const normalizedToolType = toolTypeMatch?.value.toLowerCase();

  if (normalizedToolType?.includes("mcp") || mcpIdMatch) {
    const sourceId = mcpIdMatch?.value ?? toolNameMatch?.value ?? UNKNOWN_SOURCE_ID;
    const evidence = [
      mcpIdMatch ? `direct:mcp:${mcpIdMatch.path}` : "direct:mcp:type",
      toolNameMatch ? `tool:${toolNameMatch.value}` : "tool:unknown",
    ];

    return buildAttribution("mcp_tool", sourceId, "direct", evidence);
  }

  if (normalizedToolType?.includes("plugin") || pluginIdMatch) {
    const sourceId = pluginIdMatch?.value ?? toolNameMatch?.value ?? UNKNOWN_SOURCE_ID;
    const evidence = [
      pluginIdMatch ? `direct:plugin:${pluginIdMatch.path}` : "direct:plugin:type",
      toolNameMatch ? `tool:${toolNameMatch.value}` : "tool:unknown",
    ];

    return buildAttribution("plugin_tool", sourceId, "direct", evidence);
  }

  return null;
}

function inferFromEventName(eventName: string, payload: unknown): SourceAttribution {
  const normalizedEvent = eventName.toLowerCase();

  if (normalizedEvent.includes("tool.execute")) {
    const toolNameMatch = readFirstString(payload, TOOL_NAME_PATHS);
    const inferredId = toolNameMatch?.value ?? UNKNOWN_SOURCE_ID;

    if (payloadContainsKeyword(payload, "mcp")) {
      return buildAttribution("mcp_tool", inferredId, "inferred", [
        `inferred:event:${eventName}`,
        "inferred:payload:contains-mcp",
      ]);
    }

    return buildAttribution("plugin_tool", inferredId, "inferred", [
      `inferred:event:${eventName}`,
      toolNameMatch ? `inferred:tool:${toolNameMatch.path}` : "inferred:tool:missing",
    ]);
  }

  if (normalizedEvent.includes("command")) {
    const commandMatch = readFirstString(payload, COMMAND_PATHS);

    return buildAttribution("command", commandMatch?.value ?? UNKNOWN_SOURCE_ID, "inferred", [
      `inferred:event:${eventName}`,
    ]);
  }

  if (normalizedEvent.includes("message")) {
    const messageMatch = readFirstString(payload, MESSAGE_PATHS);

    return buildAttribution("message", messageMatch?.value ?? UNKNOWN_SOURCE_ID, "inferred", [
      `inferred:event:${eventName}`,
    ]);
  }

  if (normalizedEvent.includes("session")) {
    const sessionMatch = readFirstString(payload, SESSION_PATHS);

    return buildAttribution("session", sessionMatch?.value ?? UNKNOWN_SOURCE_ID, "inferred", [
      `inferred:event:${eventName}`,
    ]);
  }

  return buildAttribution("unknown", UNKNOWN_SOURCE_ID, "inferred", [
    `unknown:event:${eventName}`,
    "unknown:insufficient-source-evidence",
  ]);
}

export function attributeSource(eventName: string, payload: unknown): SourceAttribution {
  const skillMatch = readFirstString(payload, SKILL_PATHS);
  if (skillMatch) {
    return buildAttribution("skill", skillMatch.value, "direct", [`direct:skill:${skillMatch.path}`]);
  }

  const toolMatch = detectToolAttribution(payload);
  if (toolMatch) {
    return toolMatch;
  }

  const commandMatch = readFirstString(payload, COMMAND_PATHS);
  if (commandMatch) {
    return buildAttribution("command", commandMatch.value, "direct", [
      `direct:command:${commandMatch.path}`,
    ]);
  }

  const messageMatch = readFirstString(payload, MESSAGE_PATHS);
  if (messageMatch) {
    return buildAttribution("message", messageMatch.value, "direct", [
      `direct:message:${messageMatch.path}`,
    ]);
  }

  const sessionMatch = readFirstString(payload, SESSION_PATHS);
  if (sessionMatch && eventName.toLowerCase().includes("session")) {
    return buildAttribution("session", sessionMatch.value, "direct", [
      `direct:session:${sessionMatch.path}`,
    ]);
  }

  return inferFromEventName(eventName, payload);
}
