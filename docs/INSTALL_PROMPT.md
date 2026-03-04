# Agent Install Prompt

Copy/paste this prompt into an agent to install and verify `cursed-opencode-tokentrace`.

```text
You are setting up cursed-opencode-tokentrace in this repository/workspace.

Context:
- Repo: https://github.com/CursedFactory/cursed-opencode-tokentrace
- Plugin purpose: trace token usage and conservative source attribution for OpenCode sessions.
- Conservative rule: unresolved source must be reported as `unknown`.
- Required export: JSON report files. Markdown export is optional.

Your tasks:
1) Clone (or pull) the repository and install dependencies with Bun.
2) Run local verification: lint, typecheck, tests, build.
3) Run Docker verification.
4) Configure OpenCode to load the plugin.
5) Execute a smoke test to confirm report output is written.
6) Return a concise status report with exact file paths and command output snippets.

Commands to run:
- bun install
- bun run lint
- bun run typecheck
- bun test
- bun run build
- bun run verify:docker

OpenCode configuration guidance:
- Project-level config file: ./opencode.json
- Global config file: ~/.config/opencode/opencode.json
- Add plugin reference for this package (`cursed-opencode-tokentrace`) in the `plugin` array.
- If package loading is unavailable in your environment, use local plugin loading under:
  - .opencode/plugins/
  - ~/.config/opencode/plugins/

Smoke test requirements:
- Trigger at least one tool/command event and one session.idle event.
- Confirm a JSON report is created under `.opencode/reports` (or configured output dir).
- Print the report file path and top-level totals/source keys.

Success criteria:
- Local verification commands pass.
- Docker verification passes.
- Plugin is loaded by OpenCode.
- Report file exists and includes `totals`, `sources`, and unknown fallback behavior.

If blocked:
- Clearly report blocker, attempted fix, and exact next command needed.
```
