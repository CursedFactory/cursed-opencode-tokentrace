# cursed-opencode-tokentrace: agent handoff prompt

Use this document as the single context pack for implementing `cursed-opencode-tokentrace` with minimal re-research.

## Product intent

`cursed-opencode-tokentrace` is an OpenCode plugin intended to track context/token usage signals and attribute usage to likely sources such as:

- skills
- plugin tools
- MCP-related tool calls
- commands
- message/system activity
- unknown/unattributable sources

Primary output is a durable report written to files so teams can inspect where context is being spent.

## Current instruction from owner

Do not implement in this session. Capture complete implementation context so other agents can execute independently.

## Non-negotiables

1. Conservative attribution:
   - If source identity is not explicit, classify as `unknown`.
   - Store evidence and confidence for each attribution.
2. Export support is required:
   - report must be writable to file
   - include at least JSON export
   - markdown summary export is desirable
3. Testability:
   - tracing/aggregation logic must be unit-testable without OpenCode runtime.

## OpenCode docs context (embedded notes)

### Plugin model and loading

From `https://opencode.ai/docs/plugins/`:

- Plugins can be loaded from:
  - local files in `.opencode/plugins/` and `~/.config/opencode/plugins/`
  - npm packages via `plugin: []` in `opencode.json`
- Plugin functions receive context including `project`, `client`, `$`, `directory`, `worktree`.
- Plugin hooks are returned from the plugin factory and can subscribe to named events/hooks.

### Useful hook surfaces for tokentrace

Documented hook/event families include:

- `tool.execute.before`
- `tool.execute.after`
- `command.executed`
- `message.updated` / `message.part.updated` / removals
- `session.created` / `session.updated` / `session.idle` / `session.error` / etc
- generic event stream style handling also appears in examples

Implication: trace system should accept heterogeneous payload shapes and avoid strict assumptions.

### Config and precedence notes

From `https://opencode.ai/docs/config/`:

- Config is merged, not replaced.
- Common locations:
  - project `opencode.json`
  - global `~/.config/opencode/opencode.json`
  - custom file via `OPENCODE_CONFIG`
  - custom directory via `OPENCODE_CONFIG_DIR`
- `.opencode` and `~/.config/opencode` use plural directories (`agents`, `commands`, `plugins`, `skills`, etc).

Implication: README/install docs for this plugin must explain both project-level and system-level wiring.

### Agents / skills / commands context that may affect attribution

From:
- `https://opencode.ai/docs/agents/#configure`
- `https://opencode.ai/docs/skills/`
- `https://opencode.ai/docs/commands/`

Notes:

- Agents can be JSON-configured or markdown-configured.
- Skills are loaded from `skills/<name>/SKILL.md` and invoked through the skill tool.
- Commands can route through specific agents and include template interpolation (`$ARGUMENTS`, `$1`, `!command`, `@file`).

Implication: attribution logic should look for skill and command identifiers in tool/event payloads when present.

## Inspiration context (non-binding)

From Claude Code docs:

- `https://docs.anthropic.com/en/docs/claude-code/costs`
- `https://docs.anthropic.com/en/docs/claude-code/monitoring-usage`

Useful ideas:

- usage visibility improves cost control
- token metrics should be observable over sessions
- avoid bloating context with unnecessary overhead

These pages are conceptual inspiration only; OpenCode implementation must follow OpenCode plugin APIs.

## Recommended architecture

### Core modules

1. `trace engine`
   - pure logic
   - no OpenCode runtime dependency
2. `source attribution`
   - parse payload hints and classify source
   - return confidence + evidence
3. `report exporter`
   - deterministic report object
   - writer for JSON (+ optional markdown)
4. `plugin adapter`
   - OpenCode hook bindings
   - manages runtime session map and export triggers

### Suggested source kinds

- `skill`
- `plugin_tool`
- `mcp_tool`
- `command`
- `message`
- `session`
- `unknown`

### Suggested confidence levels

- `direct`: explicit source id in payload
- `inferred`: heuristic match

## Suggested report schema

```json
{
  "sessionId": "string",
  "startedAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "exportedAt": "ISO-8601",
  "totals": {
    "inputTokens": 0,
    "outputTokens": 0,
    "cacheReadTokens": 0,
    "cacheWriteTokens": 0,
    "totalTokens": 0,
    "eventCount": 0
  },
  "sources": [
    {
      "key": "skill:issue-map",
      "kind": "skill",
      "confidence": "direct",
      "events": 0,
      "totals": {
        "inputTokens": 0,
        "outputTokens": 0,
        "cacheReadTokens": 0,
        "cacheWriteTokens": 0,
        "totalTokens": 0
      },
      "evidence": []
    }
  ],
  "notes": []
}
```

## Export requirements

1. Default output directory should be stable and predictable (ex: `.opencode/reports`).
2. File naming should include session id and timestamp.
3. Export modes:
   - manual API (callable from plugin runtime path)
   - optional auto-export on `session.idle`
4. Export must create directories if missing.

## Implementation checklist for next agent

1. Bootstrap package (`package.json`, TS config, source/test layout).
2. Implement trace engine + attribution heuristics.
3. Implement file exporter.
4. Wire plugin hooks.
5. Add tests:
   - token extraction
   - attribution direct/inferred/unknown
   - session aggregation
   - idle-triggered export
   - filesystem report output
6. Document install and usage in README.
7. Add `AGENTS.md` with repo-specific guidance.
8. Run typecheck + tests and iterate to green.

## Testing guidance

- Prefer deterministic unit tests over integration-heavy runtime tests.
- Mock payloads with multiple possible token field names:
  - `input_tokens`, `prompt_tokens`, `inputTokens`
  - `output_tokens`, `completion_tokens`, `outputTokens`
  - `total_tokens`, `totalTokens`
- Validate unknown path is safe and represented in report.

## Open questions to resolve during implementation

1. Which exact OpenCode event payload shapes include token usage today?
2. Whether tool calls expose enough metadata to separate plugin tools vs MCP tools reliably.
3. Whether markdown export should be default or opt-in.

Default policy if unresolved:
- keep behavior opt-in/configurable
- preserve raw evidence fields in report for later refinement
- avoid brittle assumptions

## Repo/process preferences from owner context

- Use GitHub CLI (`gh`) for repo operations.
- If CI workflows are added later, prefer `gh` for status/log inspection.
- In `AGENTS.md`, include a short note referencing the Loki software Linear project for cross-linking/usefulness.

## Acceptance criteria

1. Plugin can be loaded by OpenCode (local and package scenarios documented).
2. Session traces are aggregated and export to file works.
3. Report includes attribution confidence and unknown fallback.
4. Tests pass consistently.
5. Docs are sufficient for a new agent to continue without re-research.

## Canonical references

- OpenCode plugins: `https://opencode.ai/docs/plugins/`
- OpenCode config: `https://opencode.ai/docs/config/`
- OpenCode agents configure: `https://opencode.ai/docs/agents/#configure`
- OpenCode skills: `https://opencode.ai/docs/skills/`
- OpenCode commands: `https://opencode.ai/docs/commands/`
- Claude cost inspiration: `https://docs.anthropic.com/en/docs/claude-code/costs`
- Claude monitoring inspiration: `https://docs.anthropic.com/en/docs/claude-code/monitoring-usage`
