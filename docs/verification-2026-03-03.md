# Verification Snapshot (2026-03-03)

This captures command output after implementing tracing, attribution, exporter, plugin adapter,
tests, and Docker test workflows.

## Local Verification

```text
$ bun run lint
$ eslint .

$ bun run typecheck
$ tsc -p tsconfig.json --noEmit

$ bun test
bun test v1.3.9 (cf6cdbbb)

 14 pass
 0 fail
 37 expect() calls
Ran 14 tests across 5 files. [123.00ms]

$ bun run build
$ tsc -p tsconfig.json
```

## Dockerized Tests

```text
$ docker compose run --rm tests
...
bun test v1.3.10 (30e609e0)

 14 pass
 0 fail
 37 expect() calls
Ran 14 tests across 5 files. [24.00ms]
```

## Dockerized Full Verify

```text
$ docker compose run --rm verify
$ eslint .
$ tsc -p tsconfig.json --noEmit
...
 14 pass
 0 fail
$ tsc -p tsconfig.json
```

## Notes

- Docker configuration now provides two services in `docker-compose.yml`:
  - `tests`: run `bun test`
  - `verify`: run lint + typecheck + test + build
- Build context is reduced via `.dockerignore`.
