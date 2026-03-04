# AGENTS.md

Agent operating guide for `cursed-opencode-tokentrace`.

This repository is currently in a planning/bootstrap phase.
At the time of writing, the codebase contains:

- `docs/PROMPT.md`
- an empty `src/` directory

Use this file as the canonical implementation guide for agentic coding assistants.

## Project Snapshot

- Purpose: OpenCode plugin for tracing token/context usage and attributing sources.
- Primary output: durable file-based reports (JSON required, Markdown optional).
- Attribution policy: conservative by default; unresolved source => `unknown`.
- Architecture target: pure core logic + thin OpenCode adapter.
- Test strategy: deterministic unit tests over runtime-heavy integration.

## Tooling And Runtime

- Platform target: macOS/Linux development environments.
- Preferred runtime/package manager: Bun.
- Node compatibility: support standard Node LTS behavior when feasible.
- Language target: TypeScript (strict mode).
- Module system: ESM (`"type": "module"` when package is initialized).

## Build, Lint, Test Commands

The repository currently has no `package.json` scripts yet.
When bootstrapping, define scripts matching the commands below.

### Install

- `bun install`

### Build

- `bun run build`

### Lint

- `bun run lint`

### Typecheck

- `bun run typecheck`

### Test (all)

- `bun test`

### Test (single file)

- `bun test test/trace-engine.test.ts`
- `bun test src/attribution.test.ts`

### Test (single test name)

- `bun test --test-name-pattern "classifies unknown source"`

### Optional coverage

- `bun test --coverage`

### Typical local verification sequence

1. `bun run lint`
2. `bun run typecheck`
3. `bun test`
4. `bun run build`

## Suggested Script Map For package.json

When creating `package.json`, prefer this baseline:

- `build`: `tsc -p tsconfig.json`
- `lint`: `eslint .`
- `typecheck`: `tsc -p tsconfig.json --noEmit`
- `test`: `bun test`
- `test:watch`: `bun test --watch`
- `test:coverage`: `bun test --coverage`

## Repository Structure Conventions

Use this layout unless the project evolves differently:

- `src/core/` - trace engine, token normalization, aggregation
- `src/attribution/` - source detection, confidence scoring, evidence extraction
- `src/export/` - JSON/Markdown report serializers and file writers
- `src/plugin/` - OpenCode hook wiring and runtime session management
- `test/` - unit tests mirroring module boundaries
- `docs/` - design notes, examples, implementation decisions

## Code Style Guidelines

### Imports

- Use ESM imports/exports only.
- Group imports in this order:
  1. external packages
  2. internal absolute/relative modules
  3. type-only imports (`import type { ... } from ...`)
- Avoid deep relative chains when a local barrel or alias is clearer.
- Keep side-effect imports explicit and rare.

### Formatting

- Use Prettier defaults with 100-char line width.
- Prefer trailing commas where formatter applies them.
- Prefer single responsibility per function.
- Keep functions short and composable.
- Avoid comment noise; comments should explain why, not what.

### Types

- Enable strict TypeScript options.
- Avoid `any`; use `unknown` + narrowing.
- Model domain with explicit interfaces/types:
  - `TokenUsage`
  - `SourceAttribution`
  - `TraceEvent`
  - `SessionReport`
- Use discriminated unions for source kind and confidence.
- Keep core logic runtime-agnostic and serializable.

### Naming

- Files: kebab-case (`trace-engine.ts`, `source-attribution.ts`).
- Types/classes/interfaces: PascalCase.
- Functions/variables: camelCase.
- Constants: UPPER_SNAKE_CASE.
- Prefer descriptive names over abbreviations (`attributionEvidence`, not `attrEv`).

### Error Handling

- Fail safely and preserve trace continuity.
- Do not throw for non-fatal attribution ambiguity; classify as `unknown`.
- Include structured context in thrown errors for fatal paths.
- Wrap filesystem writes with clear recovery/fallback behavior.
- Never swallow errors silently; either handle or rethrow with context.

### Testing Guidelines

- Write deterministic unit tests for core modules.
- Mock heterogeneous token payload field names (`input_tokens`, `prompt_tokens`, etc.).
- Verify direct/inferred/unknown attribution behavior.
- Verify aggregation across multiple events and sessions.
- Verify exporter creates directories and writes expected files.
- Keep tests independent of OpenCode runtime whenever possible.

## Domain-Specific Implementation Rules

- Attribution must be conservative.
- If source identity is unclear, record `unknown` with evidence.
- Keep evidence array in report for future heuristic refinement.
- JSON export is mandatory.
- Markdown export is optional but encouraged.
- Default report directory should be stable (e.g. `.opencode/reports`).
- File naming should include session id + timestamp.

## OpenCode Integration Guidance

- Target relevant hooks such as:
  - `tool.execute.before`
  - `tool.execute.after`
  - `command.executed`
  - `message.updated`
  - `message.part.updated`
  - `session.idle`
- Treat event payload shapes as heterogeneous and potentially partial.
- Keep plugin adapter thin; place logic in testable pure modules.

## Cursor/Copilot Rules Check

No repository-specific rules were found in:

- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

If these files are added later, update this AGENTS.md and treat them as authoritative constraints.

## Git And PR Workflow Notes

- Use `gh` CLI for GitHub operations when remote workflows are introduced.
- Keep commits focused by module/concern.
- Do not mix refactors with behavior changes in the same commit unless necessary.
- Run lint + typecheck + tests before opening PRs.

## Cross-Team Context

- For roadmap/task cross-linking, reference the Loki software Linear project where relevant.

## Agent Execution Defaults

- Prefer safe defaults over speculative assumptions.
- Prioritize clarity and maintainability over clever abstractions.
- Record unresolved implementation questions in `docs/` with proposed defaults.
- Preserve backward compatibility in report schema once published.
