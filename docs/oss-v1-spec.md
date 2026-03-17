# OSS V1 Spec: Stable `xcode-mcli` CLI

This spec defines a stable macOS-only open-source CLI built from `/Users/n14/Projects/Open-Source/command-template` and targeted at Apple's Xcode MCP bridge exposed through `xcrun mcpbridge`.

The goal is a user-facing CLI that:

- does not require the user to register Xcode MCP into Codex or another coding agent
- does not rely on an external MCP client at runtime
- supports the full current Xcode MCP tool surface with a 1:1 command mapping
- is easy to install and operate from the terminal
- is stable enough to publish as open source for other macOS developers

## Decision

V1 ships as a Node 25 + npm + TypeScript CLI based on `command-template`, and it does **not** take `mcporter` as a runtime dependency.

Instead, the CLI talks directly to `xcrun mcpbridge` over stdio JSON-RPC and owns:

- its own Xcode bridge client
- its own daemon
- its own tab resolution policy
- its own output normalization
- its own Xcode-specific docs and guardrails

`mcporter` remains a reference implementation and design input, not a shipped dependency.

## Why This Spec Rejects A Runtime `mcporter` Dependency

`mcporter` is doing valuable generic MCP infrastructure work, but it is not the right runtime dependency for the stable public CLI described here.

Reasons:

1. This CLI has one target server only.
   It always talks to `xcrun mcpbridge`. A generic multi-server MCP client is broader than the problem.

2. Xcode MCP has Xcode-specific quirks that need first-class handling.
   The observed `XcodeListWindows` structured-content mismatch is exactly the kind of edge case that a dedicated client should own directly instead of routing through another abstraction layer.

3. The public tool should own its UX contract.
   End users should not need to understand `mcporter` config, imports, lifecycle rules, or generic MCP terminology.

4. The public tool needs a narrower long-term support surface.
   Supporting one macOS-only Xcode transport is simpler than supporting a generic MCP runtime stack.

5. The local/private tool has different constraints from the OSS tool.
   For the private tool, depending on `mcporter` is efficient. For the public tool, owning the transport is cleaner.

## What Still Gets Reused From `mcporter`

`mcporter` remains useful as:

- reference material for stdio MCP execution patterns
- reference material for daemon lifecycle ideas
- reference material for tool-schema handling and CLI ergonomics
- optional source of implementation ideas if a small helper is worth copying under license review

This spec does **not** depend on shipping `mcporter` code directly.

## Product Boundary

V1 is:

- a terminal CLI
- macOS-only
- Xcode-only
- Xcode MCP-only
- stable around current tool coverage

V1 is not:

- a generic MCP client
- an editor plugin
- a Codex integration
- a Claude integration
- a transport for non-Xcode MCP servers
- a GUI
- a cross-platform tool

## User Model

The user installs the CLI, runs a setup command once, starts or auto-starts the daemon, and then uses normal commands like:

```bash
xcode-mcli setup
xcode-mcli daemon start
xcode-mcli windows list
xcode-mcli files read --file-path Countdown/App.swift
xcode-mcli project build
xcode-mcli tests list
```

The user never has to:

- register Xcode MCP inside Codex
- touch `mcpbridge` manually
- think about JSON-RPC
- maintain a generic MCP config file

## Stability Principle

The tool is stable because it owns the narrow path:

- one transport
- one daemon
- one server
- one command contract
- one documentation set

The tool does not chase generality.

## Installation Contract

Primary install path:

```bash
npm install -g xcode-mcli
```

Primary runtime requirements:

- macOS
- Xcode with `Xcode Tools` enabled in `Settings > Intelligence`
- Node.js 25+

Optional later packaging:

- Homebrew formula

Homebrew is not required for v1.

## Repository Base

The implementation uses the `command-template` structure and coding style:

- Commander for parsing
- Zod for option contracts
- strict TypeScript ESM
- CLI-surface integration tests
- human text output plus machine JSON output

## Runtime Architecture

V1 has four runtime layers.

### 1. Bridge Client Layer

This layer spawns:

```bash
xcrun mcpbridge
```

Responsibilities:

- launch stdio subprocess
- send and receive JSON-RPC 2.0 messages
- perform MCP initialize / list tools / call tool flows
- normalize text-only and structured responses
- expose a typed internal client API

### 2. Daemon Layer

This layer keeps one long-lived Xcode bridge process alive.

Responsibilities:

- spawn and supervise the bridge client
- keep one stable client PID from Xcode's point of view
- expose a local Unix socket for CLI command processes
- hold active session state
- reconnect the bridge if it crashes
- surface daemon status and logs

### 3. Resolver Layer

This layer resolves CLI input into Xcode MCP tool arguments.

Responsibilities:

- map CLI commands to tool names
- resolve `tabIdentifier`
- convert kebab-case CLI flags to tool properties
- validate required arguments
- map defaults and friendly command behavior

### 4. Presentation Layer

This layer formats output for humans and scripts.

Responsibilities:

- print concise text by default
- emit raw JSON with `--json`
- produce stable errors and exit codes
- show Xcode-specific help and troubleshooting messages

## Daemon Design

The daemon is required for normal operation.

### Daemon Commands

V1 includes:

- `xcode-mcli daemon start`
- `xcode-mcli daemon status`
- `xcode-mcli daemon stop`
- `xcode-mcli daemon restart`

### Daemon Storage

State root:

```text
~/Library/Application Support/xcode-mcli/
```

Files:

- `daemon.sock`
- `daemon.pid`
- `daemon.log`
- `state.json`

### Daemon State

The daemon stores:

- bridge process PID
- last successful Xcode connection status
- cached active `tabIdentifier`
- cached last seen windows
- cached tool list for the current Xcode session

### Daemon Startup Policy

V1 defaults to:

- auto-start daemon on first CLI command if not running

This reduces setup friction and makes the tool feel like a normal CLI rather than a manually orchestrated background service.

## Tab Resolution Policy

Almost all useful tools need a `tabIdentifier`.

V1 resolves `tabIdentifier` in this order:

1. explicit `--tab-identifier`
2. cached active tab in daemon state
3. if exactly one Xcode window exists, auto-select it and cache it
4. otherwise fail with a clear message telling the user to run `windows list`

V1 also includes:

- `xcode-mcli windows list`
- `xcode-mcli windows use --tab-identifier <id>`

That gives users an explicit way to pin the active workspace tab.

## Output Policy

Every command supports:

- default text output
- `--json` machine output

Text output is human-first and concise.

JSON output is stable and explicit.

If Xcode returns only text where structure is expected, the CLI:

- still succeeds when the action succeeded
- includes raw text in JSON output
- uses defensive parsing only when the text format is known to be stable enough

## Exit Codes

V1 keeps the template contract:

- `0` success
- `1` runtime error
- `2` usage error

## Setup Command

V1 includes:

- `xcode-mcli setup`

Responsibilities:

- verify `xcrun mcpbridge` exists
- verify Xcode is installed
- verify the bridge is callable
- show guidance if `Xcode Tools` is disabled
- create application state directory if missing
- optionally start the daemon

`setup` does not edit Codex or Claude MCP config.

## Command Surface

V1 exposes the full current Xcode MCP surface with one CLI command per MCP tool.

The command names are user-friendly but still 1:1 with the tool layer.

### Mapping Table

| Xcode MCP Tool | CLI Command |
| --- | --- |
| `BuildProject` | `xcode-mcli project build` |
| `DocumentationSearch` | `xcode-mcli docs search` |
| `ExecuteSnippet` | `xcode-mcli snippet execute` |
| `GetBuildLog` | `xcode-mcli build log` |
| `GetTestList` | `xcode-mcli tests list` |
| `RenderPreview` | `xcode-mcli preview render` |
| `RunAllTests` | `xcode-mcli tests run-all` |
| `RunSomeTests` | `xcode-mcli tests run-some` |
| `XcodeGlob` | `xcode-mcli files glob` |
| `XcodeGrep` | `xcode-mcli files grep` |
| `XcodeLS` | `xcode-mcli files ls` |
| `XcodeListNavigatorIssues` | `xcode-mcli issues list` |
| `XcodeListWindows` | `xcode-mcli windows list` |
| `XcodeMV` | `xcode-mcli files mv` |
| `XcodeMakeDir` | `xcode-mcli files mkdir` |
| `XcodeRM` | `xcode-mcli files rm` |
| `XcodeRead` | `xcode-mcli files read` |
| `XcodeRefreshCodeIssuesInFile` | `xcode-mcli issues file` |
| `XcodeUpdate` | `xcode-mcli files update` |
| `XcodeWrite` | `xcode-mcli files write` |

### Global Flags

V1 supports these global flags:

- `--help`
- `--version`
- `--json`
- `--verbose`
- `--tab-identifier <id>`

Only `--tab-identifier` participates in tool argument resolution.

### Tool Command Contract

The CLI maps tool properties directly to kebab-case flags.

Examples:

- `sourceFilePath` -> `--source-file-path`
- `previewDefinitionIndexInFile` -> `--preview-definition-index-in-file`
- `filePath` -> `--file-path`

Array arguments accept repeated flags.

Examples:

- `--framework UIKit --framework SwiftUI`
- `--ignore "*.xcuserstate" --ignore "DerivedData/**"`

Boolean flags are explicit long flags.

Examples:

- `--recursive`
- `--show-line-numbers`
- `--replace-all`

Object arguments use repeated `key=value` flags.

Examples:

- `--env FOO=bar --env BAZ=qux`
- `--test targetName=AppTests --test testIdentifier=AppTests/testExample()`

## Exact Command Contracts

This section is the v1 CLI contract.

### `project build`

Maps to `BuildProject`.

Flags:

- `--tab-identifier <id>`

### `docs search`

Maps to `DocumentationSearch`.

Flags:

- `--query <query>` required
- `--framework <framework>` repeatable
- `--tab-identifier <id>` optional passthrough only if needed for future compatibility, ignored in v1 resolver

### `snippet execute`

Maps to `ExecuteSnippet`.

Flags:

- `--code-snippet <swift>` required
- `--source-file-path <path>` required
- `--timeout <seconds>`
- `--tab-identifier <id>`

### `build log`

Maps to `GetBuildLog`.

Flags:

- `--glob <glob>`
- `--pattern <regex>`
- `--severity <error|warning|remark>`
- `--tab-identifier <id>`

### `tests list`

Maps to `GetTestList`.

Flags:

- `--tab-identifier <id>`

### `preview render`

Maps to `RenderPreview`.

Flags:

- `--source-file-path <path>` required
- `--preview-definition-index-in-file <n>`
- `--timeout <seconds>`
- `--tab-identifier <id>`

### `tests run-all`

Maps to `RunAllTests`.

Flags:

- `--tab-identifier <id>`

### `tests run-some`

Maps to `RunSomeTests`.

Flags:

- `--test <key=value>` repeatable; required fields per logical test are:
  - `targetName`
  - `testIdentifier`
- `--tab-identifier <id>`

Example:

```bash
xcode-mcli tests run-some \
  --test targetName=CountdownTests \
  --test 'testIdentifier=CountdownTests/testExample()'
```

### `files glob`

Maps to `XcodeGlob`.

Flags:

- `--path <path>`
- `--pattern <glob>`
- `--tab-identifier <id>`

### `files grep`

Maps to `XcodeGrep`.

Flags:

- `--pattern <regex>` required
- `--glob <glob>`
- `--head-limit <n>`
- `--ignore-case`
- `--lines-after <n>`
- `--lines-before <n>`
- `--lines-context <n>`
- `--multiline`
- `--output-mode <content|files_with_matches|count>`
- `--path <path>`
- `--show-line-numbers`
- `--type <type>`
- `--tab-identifier <id>`

### `files ls`

Maps to `XcodeLS`.

Flags:

- `--path <path>` required
- `--ignore <pattern>` repeatable
- `--recursive`
- `--tab-identifier <id>`

### `issues list`

Maps to `XcodeListNavigatorIssues`.

Flags:

- `--glob <glob>`
- `--pattern <regex>`
- `--severity <error|warning|remark>`
- `--tab-identifier <id>`

### `windows list`

Maps to `XcodeListWindows`.

Flags:

- none

### `windows use`

This is a CLI-only helper, not an MCP tool.

Flags:

- `--tab-identifier <id>` required

Behavior:

- stores active tab in daemon state

### `files mv`

Maps to `XcodeMV`.

Flags:

- `--source-path <path>` required
- `--destination-path <path>` required
- `--operation <operation>`
- `--overwrite-existing`
- `--tab-identifier <id>`

### `files mkdir`

Maps to `XcodeMakeDir`.

Flags:

- `--directory-path <path>` required
- `--tab-identifier <id>`

### `files rm`

Maps to `XcodeRM`.

Flags:

- `--path <path>` required
- `--delete-files`
- `--recursive`
- `--tab-identifier <id>`

Safety rule:

- command requires `--yes`

### `files read`

Maps to `XcodeRead`.

Flags:

- `--file-path <path>` required
- `--limit <n>`
- `--offset <line>`
- `--tab-identifier <id>`

### `issues file`

Maps to `XcodeRefreshCodeIssuesInFile`.

Flags:

- `--file-path <path>` required
- `--tab-identifier <id>`

### `files update`

Maps to `XcodeUpdate`.

Flags:

- `--file-path <path>` required
- `--old-string <text>` required
- `--new-string <text>` required
- `--replace-all`
- `--tab-identifier <id>`

Safety rule:

- command requires `--yes`

### `files write`

Maps to `XcodeWrite`.

Flags:

- `--file-path <path>` required
- `--content <text>` required
- `--tab-identifier <id>`

Future-friendly ergonomic addition allowed in v1:

- `--content-file <path>` as a CLI-only convenience flag

Safety rule:

- command requires `--yes`

## Guardrails

V1 includes explicit guardrails for mutating commands.

Commands that require `--yes`:

- `files rm`
- `files update`
- `files write`
- `files mv --overwrite-existing`

The CLI prints the exact Xcode MCP tool name before execution in `--verbose` mode.

## Error Model

The CLI emits Xcode-specific error messages for these cases:

- Xcode not installed
- `xcrun mcpbridge` missing
- Xcode not running
- no open workspace windows
- multiple windows and no active tab selected
- Xcode bridge handshake failure
- daemon unavailable
- daemon stale PID/socket state
- tool output shape mismatch

The CLI treats text-only output from Xcode as a runtime contract variation, not an automatic hard failure, when the underlying call succeeded.

## Internal Module Layout

This repository structure extends the template.

```text
bin/xcode-mcli.ts
src/constants.ts
src/commands/
  daemon-start.ts
  daemon-status.ts
  daemon-stop.ts
  daemon-restart.ts
  setup.ts
  windows-list.ts
  windows-use.ts
  project-build.ts
  docs-search.ts
  snippet-execute.ts
  build-log.ts
  tests-list.ts
  tests-run-all.ts
  tests-run-some.ts
  preview-render.ts
  files-glob.ts
  files-grep.ts
  files-ls.ts
  issues-list.ts
  files-mv.ts
  files-mkdir.ts
  files-rm.ts
  files-read.ts
  issues-file.ts
  files-update.ts
  files-write.ts
  index.ts
src/core/
  command-definition.ts
  command-dispatch.ts
  errors.ts
  package-version.ts
src/runtime/
  daemon-client.ts
  daemon-host.ts
  daemon-state.ts
  mcp-bridge-process.ts
  mcp-jsonrpc.ts
  xcode-client.ts
  tab-resolver.ts
  output.ts
  guardrails.ts
  env.ts
src/contracts/
  tool-types.ts
  cli-json.ts
tests/
  ...
docs/
  api-reference.md
  setup.md
  troubleshooting.md
```

## JSON Contract

Every command returns a stable top-level JSON envelope when `--json` is set:

```json
{
  "ok": true,
  "command": "files read",
  "tool": "XcodeRead",
  "tabIdentifier": "windowtab1",
  "data": {}
}
```

Failure shape:

```json
{
  "ok": false,
  "command": "files read",
  "tool": "XcodeRead",
  "error": {
    "kind": "runtime",
    "message": "No active Xcode workspace window found."
  }
}
```

This wrapper-level JSON contract is stable even if the raw Xcode tool payload varies.

## Testing Contract

Tests stay at the CLI surface.

Required test categories:

1. command routing and help
2. setup and daemon lifecycle commands
3. active tab resolution
4. each 1:1 tool command argument contract
5. text output contract
6. JSON output contract
7. destructive command `--yes` guardrails
8. bridge handshake failure behavior
9. text-only output fallback behavior

## Documentation Contract

V1 ships with four top-level docs:

- `README.md`
- `docs/api-reference.md`
- `docs/setup.md`
- `docs/troubleshooting.md`

`README.md` stays short.

`api-reference.md` is exhaustive and mirrors the CLI contract.

`setup.md` covers:

- prerequisites
- enabling `Xcode Tools`
- install
- daemon startup
- first successful command

`troubleshooting.md` covers:

- repeated Xcode permission prompts
- no open windows
- multiple Xcode instances
- stale daemon state
- bridge errors
- output schema mismatches

## V1 Acceptance Criteria

V1 is complete when all of the following are true:

1. every currently documented Xcode MCP tool is exposed by one stable CLI command
2. repeated commands run through one daemon-backed bridge process
3. the user never needs to register Xcode MCP in Codex or another agent
4. the CLI auto-resolves the active tab when exactly one window exists
5. the CLI provides explicit tab selection when multiple windows exist
6. all mutating commands require explicit confirmation
7. text mode is concise and readable
8. JSON mode is stable and scriptable
9. the README plus setup/troubleshooting docs are sufficient for a new macOS developer to succeed without reading code
10. `make verify` passes in the repository derived from `command-template`

## Non-Goals For V1

These are intentionally out of scope:

- generic MCP server support
- Codex integration
- Claude integration
- launchd integration
- shell completion
- plugin architecture
- custom config file format beyond daemon state
- semantic high-level commands like `fix build`, `open file`, or `find symbol`
- output prettification beyond stable text and JSON

## Summary

The stable OSS v1 path is:

- base the repo on `command-template`
- own the Xcode bridge client directly
- own the daemon directly
- expose one CLI command per Xcode MCP tool
- keep the product narrow
- keep the docs explicit

That is the simplest path that is still clean enough to publish and support publicly.
