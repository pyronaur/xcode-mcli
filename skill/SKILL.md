---
name: xcode
description: Drive Apple Xcode through the local `xcode-mcli` CLI instead of attaching the Xcode MCP server. Use when Codex needs Xcode MCP-equivalent capabilities from the terminal, including window discovery, tab selection, project builds, documentation search, test listing or execution, preview rendering, snippet execution, issue inspection, file reads or mutations, or compatibility verification against pinned Xcode MCP snapshots.
---

# Xcode

## Overview

Use `xcode-mcli` as the terminal wrapper for Apple's Xcode MCP bridge.

Prefer this skill when the task needs Xcode access but the Xcode MCP server should stay detached from the agent context.

## Locate The CLI

Use one of these paths:

- Global install: `xcode-mcli`
- Repo checkout: `node /Users/n14/Projects/Tools/xcode-mcli/bin/xcode-mcli.ts`

When working from the repo checkout, use `/Users/n14/Projects/Tools/xcode-mcli` as the default project root unless the user says otherwise.

## Start Here

1. Run `xcode-mcli setup`.
2. If the first live Xcode call triggers a macOS approval dialog, wait for the user to click `Allow`.
3. Run `xcode-mcli windows list`.
4. If needed, pin the active tab with `xcode-mcli windows use --tab-identifier <id>`.
5. Run the tool-backed command you need.

## Working Rules

- Prefer `--json` when the result will be parsed or inspected programmatically.
- Use `--verbose` when you need the exact Xcode MCP tool name printed to `stderr`.
- Pass `--tab-identifier <id>` explicitly when multiple Xcode windows are open.
- Treat `files rm`, `files update`, `files write`, and `files mv --overwrite-existing` as destructive because they require `--yes`.
- Assume test execution uses the active Xcode destination from the current Xcode window.
- If a live Xcode command appears stalled, account for the user possibly needing to approve Xcode access before treating it as a failure.

## Read The Right Reference

- Read `references/setup.md` for install, first-run, daemon, and state-root behavior.
- Read `references/api-reference.md` for every CLI command, flag, JSON contract, and CLI-to-tool mapping.
- Read `references/troubleshooting.md` for approval prompts, tab resolution issues, daemon recovery, mutating command caveats, and test-destination behavior.
- Read `references/compatibility.md` when validating a new Xcode release or checking CLI parity against the pinned MCP baseline.
- Read `references/apple-xcode-26.3.surface.json` when you need the exact verbatim Xcode MCP tool descriptions, `inputSchema`, `outputSchema`, or top-level surface shape copied from live Xcode 26.3.

## Searching The Verbatim Surface Snapshot

The snapshot file is large. Search it by tool name first.

Useful patterns:

- `BuildProject`
- `DocumentationSearch`
- `RunSomeTests`
- `XcodeRead`
- `XcodeWrite`
- `XcodeListWindows`

When exact parameter or output details matter, trust the JSON snapshot over memory.

## Compatibility Workflow

When Xcode changes:

1. Run `npm run compat:xcode-mcp:verify` from `/Users/n14/Projects/Tools/xcode-mcli`.
2. If it fails, read `references/compatibility.md`.
3. Inspect the exact live-vs-baseline diff with `xcode-mcli surface verify --baseline-file skill/references/apple-xcode-26.3.surface.json --json`.
4. Use `references/apple-xcode-26.3.surface.json` as the pinned baseline reference.
