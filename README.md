# xcode-mcli

`xcode-mcli` is a macOS CLI for Apple's Xcode MCP bridge exposed through `xcrun mcpbridge`.

It gives you a daemon-backed terminal interface to the current Xcode MCP tool surface without registering Xcode MCP inside Codex or another MCP client.

## Requirements

- macOS
- Xcode with `Xcode Tools` enabled in `Settings > Intelligence`
- Node.js 25+

## Install

```bash
npm install
```

For a global install:

```bash
npm install -g xcode-mcli
```

## Quick Start

```bash
xcode-mcli setup
xcode-mcli windows list
xcode-mcli windows use --tab-identifier windowtab1
xcode-mcli files read --tab-identifier windowtab1 --file-path Path/To/File.swift
xcode-mcli project build --tab-identifier windowtab1
```

The daemon auto-starts on the first daemon-backed command.

## Output Modes

- Default output is concise text.
- `--json` prints a stable wrapper envelope.
- `--verbose` prints the exact Xcode MCP tool name to `stderr` for tool-backed commands.

Example:

```bash
xcode-mcli --json --verbose windows list
```

`--json`, `--verbose`, and `--tab-identifier <id>` can be passed either before the command path or after the specific command.

## Command Groups

- `setup`
- `daemon`
- `windows`
- `project`
- `docs`
- `snippet`
- `build`
- `issues`
- `tests`
- `preview`
- `files`

## Docs

- [docs/api-reference.md](docs/api-reference.md)
- [docs/compatibility.md](docs/compatibility.md)
- [docs/setup.md](docs/setup.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)

## Compatibility

Pin and verify the Xcode MCP surface with:

```bash
npm run compat:xcode-mcp:verify
```

The pinned Apple Xcode 26.3 baseline lives at:

```text
compat/xcode-mcp/apple-xcode-26.3.surface.json
```

## Development

```bash
npm test
make lint
make verify
```
