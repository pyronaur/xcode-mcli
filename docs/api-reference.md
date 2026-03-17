# API Reference

## Overview

`xcode-mcli` exposes Xcode MCP through command groups that map to the current Xcode MCP tool surface.

Text mode is the default.

`--json` returns a stable wrapper envelope:

```json
{
  "ok": true,
  "command": "windows list",
  "tool": "XcodeListWindows",
  "data": {
    "windows": []
  }
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
    "message": "..."
  }
}
```

For tool-backed commands, `--verbose` prints `Xcode MCP tool: <ToolName>` to `stderr`.

## Shared Flags

- `--json`
  Prints the stable JSON wrapper envelope.
- `--verbose`
  Prints the exact Xcode MCP tool name to `stderr` for tool-backed commands.
- `--tab-identifier <id>`
  Provides the active Xcode tab identifier for tab-aware commands.

Shared flags can be passed before the command path or after the specific command.

## Setup

### `xcode-mcli setup`

Prepares the local state root and verifies `xcrun mcpbridge`.

Flags:

- `--json`
- `--verbose`

## Daemon

### `xcode-mcli daemon start`

Starts the daemon.

### `xcode-mcli daemon status`

Shows whether the daemon is running and prints its PID when available.

### `xcode-mcli daemon stop`

Stops the daemon.

### `xcode-mcli daemon restart`

Restarts the daemon.

Daemon commands support:

- `--json`
- `--verbose`

## Windows

### `xcode-mcli windows list`

Calls `XcodeListWindows`.

Flags:

- `--json`
- `--verbose`

### `xcode-mcli windows use --tab-identifier <id>`

Stores the active tab identifier in daemon state.

Flags:

- `--tab-identifier <id>` required
- `--json`
- `--verbose`

## Project

### `xcode-mcli project build`

Calls `BuildProject`.

Flags:

- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

If `--tab-identifier` is omitted, the CLI resolves it from the cached active tab or a single open Xcode window.

## Docs

### `xcode-mcli docs search --query <text> [--framework <name> ...]`

Calls `DocumentationSearch`.

Flags:

- `--query <text>` required
- `--framework <name>` repeatable
- `--json`
- `--verbose`

## Snippet

### `xcode-mcli snippet execute --code-snippet <swift> --source-file-path <path> [--timeout <seconds>] [--tab-identifier <id>]`

Calls `ExecuteSnippet`.

Flags:

- `--code-snippet <swift>` required
- `--source-file-path <path>` required
- `--timeout <seconds>` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

## Build

### `xcode-mcli build log [--glob <glob>] [--pattern <regex>] [--severity <level>] [--tab-identifier <id>]`

Calls `GetBuildLog`.

Flags:

- `--glob <glob>` optional
- `--pattern <regex>` optional
- `--severity <level>` optional
  Allowed values: `error`, `warning`, `remark`
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

## Issues

### `xcode-mcli issues list [--glob <glob>] [--pattern <regex>] [--severity <level>] [--tab-identifier <id>]`

Calls `XcodeListNavigatorIssues`.

Flags:

- `--glob <glob>` optional
- `--pattern <regex>` optional
- `--severity <level>` optional
  Allowed values: `error`, `warning`, `remark`
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli issues file --file-path <path> [--tab-identifier <id>]`

Calls `XcodeRefreshCodeIssuesInFile`.

Flags:

- `--file-path <path>` required
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

## Tests

### `xcode-mcli tests list [--tab-identifier <id>]`

Calls `GetTestList`.

Flags:

- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli tests run-all [--tab-identifier <id>]`

Calls `RunAllTests`.

Flags:

- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli tests run-some --test <key=value> --test <key=value> [--tab-identifier <id>]`

Calls `RunSomeTests`.

Each selected test needs both fields:

- `targetName=<target>`
- `testIdentifier=<identifier>`

Flags:

- `--test <key=value>` repeatable
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

## Preview

### `xcode-mcli preview render --source-file-path <path> [--preview-definition-index-in-file <n>] [--timeout <seconds>] [--tab-identifier <id>]`

Calls `RenderPreview`.

Flags:

- `--source-file-path <path>` required
- `--preview-definition-index-in-file <n>` optional
- `--timeout <seconds>` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

## Files

### `xcode-mcli files glob [--path <path>] [--pattern <glob>] [--tab-identifier <id>]`

Calls `XcodeGlob`.

Flags:

- `--path <path>` optional
- `--pattern <glob>` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files grep --pattern <regex> [--glob <glob>] [--head-limit <n>] [--ignore-case] [--lines-after <n>] [--lines-before <n>] [--lines-context <n>] [--multiline] [--output-mode <mode>] [--path <path>] [--show-line-numbers] [--type <type>] [--tab-identifier <id>]`

Calls `XcodeGrep`.

Flags:

- `--pattern <regex>` required
- `--glob <glob>` optional
- `--head-limit <n>` optional
- `--ignore-case` optional
- `--lines-after <n>` optional
- `--lines-before <n>` optional
- `--lines-context <n>` optional
- `--multiline` optional
- `--output-mode <mode>` optional
  Allowed values: `content`, `files_with_matches`, `count`
- `--path <path>` optional
- `--show-line-numbers` optional
- `--type <type>` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files ls --path <path> [--ignore <pattern> ...] [--recursive] [--tab-identifier <id>]`

Calls `XcodeLS`.

Flags:

- `--path <path>` required
- `--ignore <pattern>` repeatable
- `--recursive` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files mv --source-path <path> --destination-path <path> [--operation <operation>] [--overwrite-existing] [--yes] [--tab-identifier <id>]`

Calls `XcodeMV`.

Flags:

- `--source-path <path>` required
- `--destination-path <path>` required
- `--operation <operation>` optional
- `--overwrite-existing` optional
- `--yes` required when `--overwrite-existing` is set
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files mkdir --directory-path <path> [--tab-identifier <id>]`

Calls `XcodeMakeDir`.

Flags:

- `--directory-path <path>` required
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files rm --path <path> [--delete-files] [--recursive] --yes [--tab-identifier <id>]`

Calls `XcodeRM`.

Flags:

- `--path <path>` required
- `--delete-files` optional
- `--recursive` optional
- `--yes` required
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files read --file-path <path> [--offset <line>] [--limit <n>] [--tab-identifier <id>]`

Calls `XcodeRead`.

Flags:

- `--file-path <path>` required
- `--offset <line>` optional
- `--limit <n>` optional
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files update --file-path <path> --old-string <text> --new-string <text> [--replace-all] --yes [--tab-identifier <id>]`

Calls `XcodeUpdate`.

Flags:

- `--file-path <path>` required
- `--old-string <text>` required
- `--new-string <text>` required
- `--replace-all` optional
- `--yes` required
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`

### `xcode-mcli files write --file-path <path> (--content <text> | --content-file <path>) --yes [--tab-identifier <id>]`

Calls `XcodeWrite`.

Flags:

- `--file-path <path>` required
- `--content <text>` optional
- `--content-file <path>` optional
- one of `--content` or `--content-file` is required
- `--yes` required
- `--tab-identifier <id>` optional
- `--json`
- `--verbose`
