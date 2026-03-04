import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SessionReport } from "../core/types";
import { renderAnsiReport } from "./ansi-renderer";
import { renderHtmlReport } from "./html-renderer";

export const DEFAULT_REPORT_DIRECTORY = ".opencode/reports";

export interface ExportSessionReportOptions {
  outputDir?: string;
  includeAnsi?: boolean;
  ansiColor?: boolean;
  includeHtml?: boolean;
  includeMarkdown?: boolean;
  exportedAt?: string;
}

export interface ExportResult {
  jsonPath: string;
  ansiPath?: string;
  htmlPath?: string;
  markdownPath?: string;
}

export class ReportExportError extends Error {
  readonly context: Record<string, string>;

  constructor(message: string, context: Record<string, string>, cause?: unknown) {
    super(message, {
      cause,
    });

    this.name = "ReportExportError";
    this.context = context;
  }
}

function sanitizeSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "unknown";
  }

  return trimmed.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._:-]/g, "_");
}

function sanitizeTimestamp(isoTimestamp: string): string {
  return isoTimestamp.replace(/[.:]/g, "-");
}

export function buildReportBaseName(sessionId: string, exportedAt: string): string {
  return `${sanitizeSegment(sessionId)}-${sanitizeTimestamp(exportedAt)}`;
}

export function renderMarkdownReport(report: SessionReport): string {
  const fallbackSourceLine = "| unknown | unknown:unknown | inferred | 0 | 0 |";
  const sourceLines = report.sources.length
    ? report.sources.map(
        (source) =>
          `| ${source.kind} | ${source.key} | ${source.confidence} | ${source.events} | ${source.totals.totalTokens} |`,
      )
    : [fallbackSourceLine];

  return [
    `# Token Trace Report: ${report.sessionId}`,
    "",
    `- Started: ${report.startedAt}`,
    `- Updated: ${report.updatedAt}`,
    `- Exported: ${report.exportedAt ?? "n/a"}`,
    `- Events: ${report.totals.eventCount}`,
    `- Input tokens: ${report.totals.inputTokens}`,
    `- Output tokens: ${report.totals.outputTokens}`,
    `- Cache read tokens: ${report.totals.cacheReadTokens}`,
    `- Cache write tokens: ${report.totals.cacheWriteTokens}`,
    `- Total tokens: ${report.totals.totalTokens}`,
    "",
    "## Sources",
    "",
    "| Kind | Key | Confidence | Events | Total Tokens |",
    "| --- | --- | --- | ---: | ---: |",
    ...sourceLines,
    "",
    "## Notes",
    "",
    ...(report.notes.length > 0 ? report.notes.map((note) => `- ${note}`) : ["- none"]),
    "",
  ].join("\n");
}

async function writeReportFile(filePath: string, content: string): Promise<void> {
  try {
    await writeFile(filePath, content, "utf8");
  } catch (error) {
    throw new ReportExportError("Failed to write report file", { filePath }, error);
  }
}

export async function exportSessionReport(
  report: SessionReport,
  options: ExportSessionReportOptions = {},
): Promise<ExportResult> {
  const outputDir = options.outputDir ?? DEFAULT_REPORT_DIRECTORY;
  const includeAnsi = options.includeAnsi ?? true;
  const includeHtml = options.includeHtml ?? false;
  const includeMarkdown = options.includeMarkdown ?? false;
  const ansiColor = options.ansiColor ?? false;
  const exportedAt = options.exportedAt ?? report.exportedAt ?? new Date().toISOString();
  const reportToWrite: SessionReport = {
    ...report,
    exportedAt,
  };
  const baseName = buildReportBaseName(report.sessionId, exportedAt);

  try {
    await mkdir(outputDir, {
      recursive: true,
    });
  } catch (error) {
    throw new ReportExportError("Failed to create report directory", { outputDir }, error);
  }

  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const jsonBody = JSON.stringify(reportToWrite, null, 2);
  await writeReportFile(jsonPath, jsonBody);

  const result: ExportResult = {
    jsonPath,
  };

  if (includeAnsi) {
    const ansiPath = path.join(outputDir, `${baseName}.ansi.txt`);
    await writeReportFile(
      ansiPath,
      renderAnsiReport(reportToWrite, {
        colorEnabled: ansiColor,
      }),
    );
    result.ansiPath = ansiPath;
  }

  if (includeHtml) {
    const htmlPath = path.join(outputDir, `${baseName}.html`);
    await writeReportFile(htmlPath, renderHtmlReport(reportToWrite));
    result.htmlPath = htmlPath;
  }

  if (includeMarkdown) {
    const markdownPath = path.join(outputDir, `${baseName}.md`);
    await writeReportFile(markdownPath, renderMarkdownReport(reportToWrite));
    result.markdownPath = markdownPath;
  }

  return result;
}
