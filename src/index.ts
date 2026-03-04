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
export type { ExportResult, ExportSessionReportOptions } from "./export/report-exporter";
export type { HookHandler, TokenTracePlugin, TokenTracePluginOptions } from "./plugin/tokentrace-plugin";
