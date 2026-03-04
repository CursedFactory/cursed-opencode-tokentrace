# cursed-opencode-tokentrace

[![Build](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/build.yml)
[![Test](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/test.yml)
[![Docker](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/docker.yml/badge.svg?branch=master)](https://github.com/CursedFactory/cursed-opencode-tokentrace/actions/workflows/docker.yml)

OpenCode plugin core for tracing token usage, attributing likely sources, and exporting durable reports.

The design is intentionally conservative: if source identity is not clear, attribution is recorded as
`unknown` instead of guessing.

## What you get

- Token extraction across heterogeneous payload fields (`input_tokens`, `prompt_tokens`, etc.)
- Source attribution with confidence + evidence (`direct` or `inferred`)
- Session aggregation across tool/command/message/session events
- File export with JSON (required) and Markdown (optional)
- Deterministic unit tests for core logic and plugin adapter behavior

## Install

```bash
bun install
```

## Run locally

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

Run a single test file:

```bash
bun test test/trace-engine.test.ts
```

Run a single test name:

```bash
bun test --test-name-pattern "unknown"
```

## Docker workflow

Run tests in Docker:

```bash
bun run test:docker
```

Run full Docker verification (lint + typecheck + test + build):

```bash
bun run verify:docker
```

## Agent install prompt

Use `docs/INSTALL_PROMPT.md` when you want another coding agent to install, configure, and
smoke-test this plugin with minimal back-and-forth.

## Quick usage example

```ts
import { createTokenTracePlugin } from "cursed-opencode-tokentrace";

const plugin = createTokenTracePlugin({
  autoExportOnIdle: true,
  includeMarkdown: true,
  outputDir: ".opencode/reports",
});

await plugin.hooks["tool.execute.after"]({
  sessionId: "session-42",
  tool: { type: "mcp", name: "context7.search" },
  mcpServer: "context7",
  usage: { input_tokens: 120, output_tokens: 45 },
});

await plugin.hooks["session.idle"]({ sessionId: "session-42" });
```

## Example report output

Sample JSON report (`docs/examples/sample-session-report.json`):

```json
{
  "sessionId": "session-42",
  "totals": {
    "totalTokens": 377,
    "eventCount": 6
  },
  "sources": [
    { "key": "skill:issue-map", "kind": "skill", "confidence": "direct" },
    { "key": "mcp_tool:context7", "kind": "mcp_tool", "confidence": "direct" },
    { "key": "unknown:unknown", "kind": "unknown", "confidence": "inferred" }
  ]
}
```

Sample Markdown report (`docs/examples/sample-session-report.md`) is included for human review.

## Terminal / ASCII captures

- Full verification snapshot: `docs/verification-2026-03-03.md`
- Raw terminal capture: `docs/examples/terminal-verify.txt`

Excerpt:

```text
14 pass
0 fail
37 expect() calls
Ran 14 tests across 5 files.
```

## Project layout

- `src/core/` - token extraction and session aggregation
- `src/attribution/` - source classification + evidence
- `src/export/` - JSON/Markdown serializers and file writes
- `src/plugin/` - OpenCode hook adapter
- `test/` - deterministic unit tests

## Notes

- Default report directory: `.opencode/reports`
- Report filenames include `sessionId` + timestamp
- Unknown attribution is always preserved for safe accounting

## License

MIT
