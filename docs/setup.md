# Setup

## Requirements

- macOS
- Xcode installed
- `Xcode Tools` enabled in `Settings > Intelligence`
- Node.js 25+

## Install

From the repo:

```bash
npm install
```

Global install:

```bash
npm install -g xcode-mcli
```

## First Run

Verify the bridge and initialize the local state root:

```bash
xcode-mcli setup
```

If `setup` reports `Failed to call xcrun mcpbridge --help.`, enable `Xcode Tools` in `Settings > Intelligence` and run `xcode-mcli setup` again.

Then confirm Xcode access:

```bash
xcode-mcli windows list
```

If exactly one Xcode workspace window is open, many tab-aware commands can resolve it automatically.

To pin the active tab explicitly:

```bash
xcode-mcli windows use --tab-identifier windowtab1
```

## Daemon

The daemon auto-starts on the first daemon-backed command.

Explicit lifecycle commands:

```bash
xcode-mcli daemon start
xcode-mcli daemon status
xcode-mcli daemon restart
xcode-mcli daemon stop
```

## State Root

The default state root is:

```text
~/Library/Application Support/xcode-mcli
```

Files used there:

- `daemon.sock`
- `daemon.pid`
- `daemon.log`
- `state.json`

## Common Commands

```bash
xcode-mcli windows list
xcode-mcli files read --tab-identifier windowtab1 --file-path Path/To/File.swift
xcode-mcli build log --tab-identifier windowtab1
xcode-mcli project build --tab-identifier windowtab1
xcode-mcli tests list --tab-identifier windowtab1
```

## Machine Output

Use `--json` for a stable wrapper envelope:

```bash
xcode-mcli --json windows list
```

Use `--verbose` to print the exact Xcode MCP tool name to `stderr` for tool-backed commands:

```bash
xcode-mcli --json --verbose windows list
```

`--json`, `--verbose`, and `--tab-identifier <id>` can be passed before the command path or after the specific command.

## Compatibility Check

Verify the pinned Apple Xcode 26.3 MCP surface:

```bash
npm run compat:xcode-mcp:verify
```

Capture the current live surface:

```bash
npm run compat:xcode-mcp:snapshot
```

Pin a canonical baseline file:

```bash
npm run compat:xcode-mcp:pin-26.3
```
