export { attributeSource } from "./attribution/source-attribution";
export { TraceEngine } from "./core/trace-engine";
export { addTokenUsage, createEmptyTokenUsage, extractTokenUsage } from "./core/token-usage";
export {
  buildReportBaseName,
  DEFAULT_REPORT_DIRECTORY,
  exportSessionReport,
  renderMarkdownReport,
  ReportExportError,
} from "./export/report-exporter";
export { renderAnsiReport } from "./export/ansi-renderer";
export { renderHtmlReport } from "./export/html-renderer";
export { createTokenTracePlugin } from "./plugin/tokentrace-plugin";

export type {
  AttributionConfidence,
  SessionReport,
  SessionTotals,
  SourceAttribution,
  SourceKind,
  SourceReport,
  TokenUsage,
  TraceEventInput,
} from "./core/types";
export type { AnsiRenderOptions } from "./export/ansi-renderer";
export type { ExportResult, ExportSessionReportOptions } from "./export/report-exporter";
export type { HtmlRenderOptions } from "./export/html-renderer";
export type { HookHandler, TokenTracePlugin, TokenTracePluginOptions } from "./plugin/tokentrace-plugin";
