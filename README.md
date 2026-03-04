# Cursed OpenCode Token Trace

An OpenCode plugin for tracing token and context usage, attributing sources, and generating durable reports.

## Project Purpose

The primary goal of this project is to provide a robust mechanism for tracking and attributing token and context usage within the OpenCode environment. This is crucial for understanding resource consumption, optimizing prompts, and ensuring proper attribution of generated content.

## Features

- **Token Usage Tracing**: Monitor and log token consumption across various OpenCode operations.
- **Context Attribution**: Link token usage back to its original source or context (e.g., specific files, user prompts, tool outputs).
- **Durable Reports**: Generate persistent reports in JSON (mandatory) and Markdown (optional) formats, detailing token usage and attribution.
- **Conservative Attribution Policy**: Prioritize accuracy; unresolved sources are marked as `unknown`.

## Architecture

The project is designed with a pure core logic, complemented by a thin OpenCode adapter. This separation ensures that the core tracing and attribution mechanisms are highly testable and independent of the OpenCode runtime.

- `src/core/`: Contains the fundamental logic for the trace engine, token normalization, and aggregation.
- `src/attribution/`: Handles source detection, confidence scoring, and evidence extraction.
- `src/export/`: Manages JSON/Markdown report serialization and file writing.
- `src/plugin/`: Provides the OpenCode hook wiring and runtime session management.

## Development

### Prerequisites

- [Bun](https://bun.sh/) (preferred package manager and runtime)
- Node.js (LTS compatible)
- TypeScript (strict mode)

### Installation

```bash
bun install
```

### Build

```bash
bun run build
```

### Lint

```bash
bun run lint
```

### Type Check

```bash
bun run typecheck
```

### Test

```bash
bun test
```

## Contributing

Contributions are welcome! Please refer to `AGENTS.md` for detailed guidelines on code style, commit conventions, and testing.

## License

This project is licensed under the MIT License.

