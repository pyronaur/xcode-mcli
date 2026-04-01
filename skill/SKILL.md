---
name: xcode
description: Read when to interact with Xcode.app directly and task needs Xcode current window or tab selection, issue navigator data, build log inspection, documentation search, snippet execution, preview rendering, test discovery or selective execution, workspace-scoped file operations
---

# Xcode

## Choose The Tool Surface

Switch to `xcode-mcli` when the task depends on Xcode's live app state or an Xcode MCP surface.

Use `xcode-mcli` for:
- current Xcode window or tab selection
- issue navigator results
- build log inspection as Xcode reports it
- documentation search through Xcode
- Swift snippet execution tied to a source file
- SwiftUI preview rendering
- test discovery or selective test execution from the active Xcode context
- workspace-scoped file operations through Xcode
- MCP surface snapshot or compatibility verification

## Locate The CLI

Use one of these paths:

- Global install: `xcode-mcli`
- Repo checkout: `node ./bin/xcode-mcli.ts`

When working from the repo checkout, use the `xcode-mcli` repository root as the default project root unless the user says otherwise.

## Start Here

1. Run `xcode-mcli setup`.
2. If the first live Xcode call triggers a macOS approval dialog, wait for the user to click `Allow`.
3. Open the project in Xcode with `xed /path/to/App.xcworkspace`, then run `xcode-mcli windows list`.
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

1. Run `npm run compat:xcode-mcp:verify` from the `xcode-mcli` repository root.
2. If it fails, read `references/compatibility.md`.
3. Inspect the exact live-vs-baseline diff with `xcode-mcli surface verify --baseline-file skill/references/apple-xcode-26.3.surface.json --json`.
4. Use `references/apple-xcode-26.3.surface.json` as the pinned baseline reference.
