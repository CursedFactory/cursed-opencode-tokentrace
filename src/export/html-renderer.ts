import type { SessionReport, SourceReport } from "../core/types";
import {
  computeConfidenceBuckets,
  computeSourceSegments,
  formatInteger,
  formatPercent,
  sortSourcesByTotal,
} from "./chart-helpers";

export interface HtmlRenderOptions {
  title?: string;
  darkMode?: "auto" | "light" | "dark";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSummaryCard(label: string, value: number): string {
  return [
    '<article class="summary-card">',
    `  <h3>${escapeHtml(label)}</h3>`,
    `  <p>${escapeHtml(formatInteger(value))}</p>`,
    "</article>",
  ].join("\n");
}

function renderSourceTableRows(sources: SourceReport[], totalTokens: number): string {
  return sources
    .map((source) => {
      const share = totalTokens > 0 ? source.totals.totalTokens / totalTokens : 0;
      const rowClass = source.kind === "unknown" ? "unknown-row" : "";

      return [
        `<tr class="${rowClass}">`,
        `  <td data-sort-value="${escapeHtml(source.kind)}">${escapeHtml(source.kind)}</td>`,
        `  <td data-sort-value="${escapeHtml(source.key)}">${escapeHtml(source.key)}</td>`,
        `  <td data-sort-value="${escapeHtml(source.confidence)}">${escapeHtml(source.confidence)}</td>`,
        `  <td data-sort-value="${source.events}" class="num">${escapeHtml(formatInteger(source.events))}</td>`,
        `  <td data-sort-value="${source.totals.inputTokens}" class="num">${escapeHtml(formatInteger(source.totals.inputTokens))}</td>`,
        `  <td data-sort-value="${source.totals.outputTokens}" class="num">${escapeHtml(formatInteger(source.totals.outputTokens))}</td>`,
        `  <td data-sort-value="${source.totals.cacheReadTokens + source.totals.cacheWriteTokens}" class="num">${escapeHtml(formatInteger(source.totals.cacheReadTokens + source.totals.cacheWriteTokens))}</td>`,
        `  <td data-sort-value="${source.totals.totalTokens}" class="num">${escapeHtml(formatInteger(source.totals.totalTokens))}</td>`,
        `  <td data-sort-value="${share}" class="num">${escapeHtml(formatPercent(share))}</td>`,
        "</tr>",
      ].join("\n");
    })
    .join("\n");
}

function renderUnknownPanel(sources: SourceReport[]): string {
  const unknownSources = sources.filter((source) => source.kind === "unknown");

  if (unknownSources.length === 0) {
    return [
      '<details id="unknown-detail">',
      "  <summary>Unknown Sources (0)</summary>",
      "  <p>All sources are currently attributed.</p>",
      "</details>",
    ].join("\n");
  }

  const items = unknownSources
    .map((source) => {
      const evidenceList = source.evidence.length
        ? `<ul>${source.evidence.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`
        : "<p>No evidence captured.</p>";

      return [
        '<li class="unknown-item">',
        `  <p><strong>${escapeHtml(source.key)}</strong> · ${escapeHtml(formatInteger(source.totals.totalTokens))} tokens</p>`,
        `  ${evidenceList}`,
        "</li>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<details id="unknown-detail" open>',
    `  <summary>Unknown Sources (${unknownSources.length})</summary>`,
    `  <ul class="unknown-list">${items}</ul>`,
    "</details>",
  ].join("\n");
}

function renderSourceShareBar(report: SessionReport): string {
  const segments = computeSourceSegments(report);

  if (segments.length === 0) {
    return "<p>No source data available yet.</p>";
  }

  const segmentMarkup = segments
    .map((segment) => {
      const width = Math.max(0, Math.min(100, segment.share * 100));
      const className = segment.isUnknown ? "segment unknown" : "segment known";

      return `<div class="${className}" style="width:${width.toFixed(2)}%" title="${escapeHtml(`${segment.key} · ${formatInteger(segment.value)} tokens · ${formatPercent(segment.share)}`)}"></div>`;
    })
    .join("");

  return `<div class="stacked-bar" role="img" aria-label="Source token share">${segmentMarkup}</div>`;
}

function resolveThemeMode(mode: "auto" | "light" | "dark"): string {
  if (mode === "light") {
    return "theme-light";
  }

  if (mode === "dark") {
    return "theme-dark";
  }

  return "theme-auto";
}

export function renderHtmlReport(report: SessionReport, options: HtmlRenderOptions = {}): string {
  const title = options.title ?? "Token Trace Report";
  const themeClass = resolveThemeMode(options.darkMode ?? "auto");
  const sortedSources = sortSourcesByTotal(report.sources);
  const confidenceBuckets = computeConfidenceBuckets(report);
  const directBucket = confidenceBuckets.find((bucket) => bucket.confidence === "direct");
  const inferredBucket = confidenceBuckets.find((bucket) => bucket.confidence === "inferred");
  const directWidth = `${((directBucket?.share ?? 0) * 100).toFixed(2)}%`;
  const inferredWidth = `${((inferredBucket?.share ?? 0) * 100).toFixed(2)}%`;

  return [
    "<!DOCTYPE html>",
    `<html lang="en" class="${themeClass}">`,
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(`${title} · ${report.sessionId}`)}</title>`,
    "  <style>",
    "    :root {",
    "      --bg: #0d1117;",
    "      --panel: #161b22;",
    "      --text: #e6edf3;",
    "      --muted: #8b949e;",
    "      --border: #30363d;",
    "      --good: #238636;",
    "      --warn: #d29922;",
    "      --inferred: #6e7681;",
    "      --accent: #2f81f7;",
    "      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;",
    "      --sans: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif;",
    "    }",
    "    .theme-light {",
    "      --bg: #f8fafc;",
    "      --panel: #ffffff;",
    "      --text: #1f2328;",
    "      --muted: #656d76;",
    "      --border: #d0d7de;",
    "      --good: #1a7f37;",
    "      --warn: #9a6700;",
    "      --inferred: #6e7781;",
    "      --accent: #0969da;",
    "    }",
    "    @media (prefers-color-scheme: light) {",
    "      .theme-auto {",
    "        --bg: #f8fafc;",
    "        --panel: #ffffff;",
    "        --text: #1f2328;",
    "        --muted: #656d76;",
    "        --border: #d0d7de;",
    "        --good: #1a7f37;",
    "        --warn: #9a6700;",
    "        --inferred: #6e7781;",
    "        --accent: #0969da;",
    "      }",
    "    }",
    "    body {",
    "      margin: 0;",
    "      background: var(--bg);",
    "      color: var(--text);",
    "      font-family: var(--sans);",
    "      line-height: 1.45;",
    "    }",
    "    main {",
    "      max-width: 1100px;",
    "      margin: 0 auto;",
    "      padding: 24px 16px 48px;",
    "    }",
    "    .header {",
    "      background: var(--panel);",
    "      border: 1px solid var(--border);",
    "      border-radius: 12px;",
    "      padding: 18px;",
    "      margin-bottom: 18px;",
    "    }",
    "    .header h1 { margin: 0 0 8px; font-size: 1.4rem; }",
    "    .header p { margin: 4px 0; color: var(--muted); font-family: var(--mono); font-size: 0.92rem; }",
    "    .cards {",
    "      display: grid;",
    "      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));",
    "      gap: 10px;",
    "      margin-bottom: 18px;",
    "    }",
    "    .summary-card {",
    "      background: var(--panel);",
    "      border: 1px solid var(--border);",
    "      border-radius: 10px;",
    "      padding: 12px;",
    "    }",
    "    .summary-card h3 { margin: 0 0 8px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }",
    "    .summary-card p { margin: 0; font-size: 1.25rem; font-family: var(--mono); }",
    "    section {",
    "      background: var(--panel);",
    "      border: 1px solid var(--border);",
    "      border-radius: 10px;",
    "      padding: 14px;",
    "      margin-bottom: 16px;",
    "    }",
    "    section h2 { margin: 0 0 12px; font-size: 1rem; }",
    "    .stacked-bar {",
    "      display: flex;",
    "      width: 100%;",
    "      height: 24px;",
    "      border-radius: 999px;",
    "      overflow: hidden;",
    "      border: 1px solid var(--border);",
    "      background: #20252c;",
    "    }",
    "    .segment { height: 100%; }",
    "    .segment.known { background: linear-gradient(90deg, var(--good), #2ea043); }",
    "    .segment.unknown {",
    "      background: repeating-linear-gradient(45deg, var(--warn), var(--warn) 8px, #7d4e08 8px, #7d4e08 16px);",
    "    }",
    "    .confidence-bar {",
    "      display: flex;",
    "      height: 18px;",
    "      border: 1px solid var(--border);",
    "      border-radius: 999px;",
    "      overflow: hidden;",
    "      background: #20252c;",
    "      margin-bottom: 10px;",
    "    }",
    "    .confidence-direct { background: var(--good); }",
    "    .confidence-inferred { background: var(--inferred); }",
    "    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }",
    "    th, td { border-top: 1px solid var(--border); padding: 8px; text-align: left; }",
    "    th { cursor: pointer; user-select: none; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); }",
    "    td.num { text-align: right; font-family: var(--mono); }",
    "    .unknown-row td { border-left: 3px solid var(--warn); }",
    "    .legend { color: var(--muted); font-size: 0.88rem; margin-top: 10px; }",
    "    #unknown-detail { border: 1px solid var(--border); border-radius: 8px; padding: 10px; }",
    "    #unknown-detail summary { cursor: pointer; font-weight: 600; color: var(--warn); }",
    "    .unknown-list { margin: 8px 0 0; padding-left: 18px; }",
    "    .unknown-item { margin-bottom: 10px; }",
    "    .unknown-item p { margin: 0 0 6px; }",
    "    .unknown-item ul { margin: 0; color: var(--muted); }",
    "    footer { color: var(--muted); font-size: 0.85rem; text-align: right; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    '    <header id="report-header" class="header">',
    `      <h1>${escapeHtml(title)}</h1>`,
    `      <p>Session: ${escapeHtml(report.sessionId)}</p>`,
    `      <p>Started: ${escapeHtml(report.startedAt)} · Updated: ${escapeHtml(report.updatedAt)} · Exported: ${escapeHtml(report.exportedAt ?? "n/a")}</p>`,
    "    </header>",
    '    <section id="summary-cards" class="cards">',
    renderSummaryCard("Input", report.totals.inputTokens),
    renderSummaryCard("Output", report.totals.outputTokens),
    renderSummaryCard("Cache Read", report.totals.cacheReadTokens),
    renderSummaryCard("Cache Write", report.totals.cacheWriteTokens),
    renderSummaryCard("Total", report.totals.totalTokens),
    renderSummaryCard("Events", report.totals.eventCount),
    "    </section>",
    '    <section id="source-chart">',
    "      <h2>Source Token Share</h2>",
    `      ${renderSourceShareBar(report)}`,
    "      <p class=\"legend\">Unknown segments are striped and always visible in this chart.</p>",
    "    </section>",
    '    <section id="confidence-split">',
    "      <h2>Attribution Confidence</h2>",
    '      <div class="confidence-bar" role="img" aria-label="Confidence split">',
    `        <span class="confidence-direct" style="width:${directWidth}"></span>`,
    `        <span class="confidence-inferred" style="width:${inferredWidth}"></span>`,
    "      </div>",
    `      <p class="legend">Direct: ${escapeHtml(formatInteger(directBucket?.totalTokens ?? 0))} tokens (${escapeHtml(formatPercent(directBucket?.share ?? 0))}) · Inferred: ${escapeHtml(formatInteger(inferredBucket?.totalTokens ?? 0))} tokens (${escapeHtml(formatPercent(inferredBucket?.share ?? 0))})</p>`,
    "    </section>",
    '    <section id="source-table">',
    "      <h2>Sources</h2>",
    "      <table>",
    "        <thead>",
    "          <tr>",
    '            <th data-col="0" scope="col">Kind</th>',
    '            <th data-col="1" scope="col">Key</th>',
    '            <th data-col="2" scope="col">Confidence</th>',
    '            <th data-col="3" scope="col">Events</th>',
    '            <th data-col="4" scope="col">Input</th>',
    '            <th data-col="5" scope="col">Output</th>',
    '            <th data-col="6" scope="col">Cache</th>',
    '            <th data-col="7" scope="col">Total</th>',
    '            <th data-col="8" scope="col">Share</th>',
    "          </tr>",
    "        </thead>",
    "        <tbody>",
    renderSourceTableRows(sortedSources, report.totals.totalTokens),
    "        </tbody>",
    "      </table>",
    "    </section>",
    '    <section id="unknown-panel">',
    "      <h2>Unknown Attribution Details</h2>",
    `      ${renderUnknownPanel(sortedSources)}`,
    "    </section>",
    '    <section id="notes">',
    "      <h2>Notes</h2>",
    report.notes.length > 0
      ? `      <ul>${report.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
      : "      <p class=\"legend\">none</p>",
    "    </section>",
    "    <footer>",
    `      Generated from session ${escapeHtml(report.sessionId)} at ${escapeHtml(report.exportedAt ?? "n/a")}`,
    "    </footer>",
    "  </main>",
    "  <script>",
    "    (() => {",
    "      const table = document.querySelector('#source-table table');",
    "      if (!table) return;",
    "      const headers = table.querySelectorAll('th[data-col]');",
    "      const tbody = table.querySelector('tbody');",
    "      if (!tbody) return;",
    "      let sortState = { col: 7, direction: -1 };",
    "      const getCellSortValue = (row, colIndex) => {",
    "        const cell = row.cells[colIndex];",
    "        if (!cell) return '';",
    "        const raw = cell.getAttribute('data-sort-value') ?? cell.textContent ?? '';",
    "        const numeric = Number(raw);",
    "        return Number.isFinite(numeric) ? numeric : raw.toLowerCase();",
    "      };",
    "      const sortRows = (col, direction) => {",
    "        const rows = Array.from(tbody.querySelectorAll('tr'));",
    "        rows.sort((a, b) => {",
    "          const left = getCellSortValue(a, col);",
    "          const right = getCellSortValue(b, col);",
    "          if (left < right) return -1 * direction;",
    "          if (left > right) return 1 * direction;",
    "          return 0;",
    "        });",
    "        rows.forEach((row) => tbody.appendChild(row));",
    "      };",
    "      headers.forEach((header) => {",
    "        header.addEventListener('click', () => {",
    "          const col = Number(header.getAttribute('data-col'));",
    "          const nextDirection = sortState.col === col ? sortState.direction * -1 : -1;",
    "          sortState = { col, direction: nextDirection };",
    "          sortRows(col, nextDirection);",
    "        });",
    "      });",
    "      sortRows(sortState.col, sortState.direction);",
    "    })();",
    "  </script>",
    "</body>",
    "</html>",
  ].join("\n");
}
