# Verification Snapshot (2026-03-03)

This captures command output after implementing tracing, attribution, exporter, plugin adapter,
ANSI/HTML report renderers, tests, and Docker verification workflows.

## Local Verification

```text
$ bun run lint
$ eslint .

$ bun run typecheck
$ tsc -p tsconfig.json --noEmit

$ bun test
bun test v1.3.9 (cf6cdbbb)

 18 pass
 0 fail
 59 expect() calls
Ran 18 tests across 7 files. [30.00ms]

$ bun run build
$ tsc -p tsconfig.json
```

## Dockerized Tests

```text
$ bun run test:docker
$ docker compose run --rm --build tests
bun test v1.3.10 (30e609e0)

 18 pass
 0 fail
 59 expect() calls
Ran 18 tests across 7 files. [35.00ms]
```

## Dockerized Full Verify

```text
$ bun run verify:docker
$ docker compose run --rm --build verify
$ eslint .
$ tsc -p tsconfig.json --noEmit
...
 18 pass
 0 fail
$ tsc -p tsconfig.json
```

## Notes

- Docker configuration now provides two services in `docker-compose.yml`:
  - `tests`: run `bun test`
  - `verify`: run lint + typecheck + test + build
- Build context is reduced via `.dockerignore`.
- Export now produces JSON plus ANSI (`.ansi.txt`) by default, with optional HTML (`.html`) and
  Markdown (`.md`).
