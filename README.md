# command-template

Reusable strict TypeScript CLI template for npm packages.

## Features

- Node 25 + npm + ESM TypeScript setup.
- Strict lint/typecheck/duplication/unused checks.
- Commander-based CLI parsing with native help and version flags.
- Shared Zod option contracts with inferred handler types.
- Path-based command definitions supporting flexible depth.
- Starter commands: `hello` and `project version`.

## Prerequisites

- Node.js 25 or newer
- npm

Install dependencies:

```bash
npm install
```

## Commands

```bash
command-template hello [--name <name>]
command-template project version
command-template --version
```

Examples:

```bash
command-template hello
command-template hello --name Ada
command-template project version
```

## Development Commands

```bash
npm test
make lint-dry
make lint
make verify
```

## Add a New Command

1. Add `src/commands/<name>.ts`.
2. Export a command definition using `defineCommand(...)`.
3. Register it in `src/commands/index.ts`.
4. Add command tests under `tests/`.
5. Update command usage in this README and `docs/api-reference.md`.

Command definitions use path segments:

- One-level command: `path: ["publish"]`
- Two-level command: `path: ["project", "publish"]`
- Three-level command: `path: ["workspace", "full", "sync"]`

Options are parsed by Commander and validated by Zod in `optionsSchema`.

## CLI UX Defaults

- Human-first output: commands print short sentence-style text.
- Global flags: `--help` and `--version`.
- Parse and validation failures map to usage errors (`exitCode=2`).
- Command runtime failures map to runtime errors (`exitCode=1`).

Prefer one-level and two-level commands by default. Use deeper paths only when grouping clearly improves discoverability.

## Use This as a Template Repo

When cloning or generating a new package from this template, update:

1. `package.json`:
   - `name`
   - `description`
   - `bin` command key and path
2. `bin/command-template.ts` filename (if command name changes).
3. `src/core/command-dispatch.ts`:
   - top-level CLI title
   - usage strings
4. README examples and docs command names.
5. tests that assert command names/output.

## API Docs

- `docs/api-reference.md`
