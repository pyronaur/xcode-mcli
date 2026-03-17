# Xcode MCP Overview

## What This Is

Xcode MCP is the Model Context Protocol server provided by Xcode itself. Apple documents external access through the `xcrun mcpbridge` command, which acts as a stdio bridge between an MCP client and Xcode's internal MCP tool service.

This research pack treats that server as the source of truth.

It does not cover `xcodebuildmcp`.

## Official Apple Setup Model

Apple's documented setup flow is:

1. In Xcode, open `Settings > Intelligence`.
2. Under `Model Context Protocol`, turn `Xcode Tools` on.
3. Register the server in the client as a stdio MCP server that runs `xcrun mcpbridge`.

Apple's own external-agent examples:

```bash
claude mcp add --transport stdio xcode -- xcrun mcpbridge
codex mcp add xcode -- xcrun mcpbridge
```

Official Apple source used here:

- `vendor/apple/giving-agentic-coding-tools-access-to-xcode.md`

## Local Machine Evidence

Observed on this machine during the research pass:

- Xcode version: `26.3`
- Xcode build: `17C519`
- `mcpbridge` path: `/Applications/XcodeRC.app/Contents/Developer/usr/bin/mcpbridge`

Raw evidence files:

- `research/xcode-version.txt`
- `research/mcpbridge-path.txt`
- `research/mcpbridge-help.txt`

## What `mcpbridge` Does

From `xcrun mcpbridge --help`:

- It is a `STDIO Bridge for Xcode MCP Tools`.
- It reads JSON-RPC 2.0 from stdin.
- It forwards responses to stdout.
- It connects the MCP client to Xcode's internal MCP tool service.

This means the bridge is thin. It is not the interesting layer from a wrapper-design perspective. The interesting layer is the tool catalog behind it.

## Current Bridge-Level Config Surface

Documented knobs:

- Xcode UI toggle: `Settings > Intelligence > Xcode Tools`
- Environment variable: `MCP_XCODE_PID`
- Environment variable: `MCP_XCODE_SESSION_ID`

No other user-facing CLI flags were exposed by `xcrun mcpbridge --help` beyond `-h`, `-help`, and `--help`.

## Bridge Selection Behavior

Apple documents the following `MCP_XCODE_PID` fallback logic:

1. If `MCP_XCODE_PID` is set, connect to that Xcode process.
2. If it is not set and exactly one Xcode process is running, use that process.
3. If multiple Xcode processes are running, use `xcode-select` to determine which Xcode is selected and connect to that one.
4. If no Xcode processes are found, exit with error.

That logic matters for wrapper design because a wrapper that talks to a specific Xcode instance should probably set `MCP_XCODE_PID` explicitly instead of relying on auto-selection.

## Current Live Tool Inventory

The `xcode` MCP surface exposed in this session currently contains 20 tools:

1. `BuildProject`
2. `DocumentationSearch`
3. `ExecuteSnippet`
4. `GetBuildLog`
5. `GetTestList`
6. `RenderPreview`
7. `RunAllTests`
8. `RunSomeTests`
9. `XcodeGlob`
10. `XcodeGrep`
11. `XcodeLS`
12. `XcodeListNavigatorIssues`
13. `XcodeListWindows`
14. `XcodeMV`
15. `XcodeMakeDir`
16. `XcodeRM`
17. `XcodeRead`
18. `XcodeRefreshCodeIssuesInFile`
19. `XcodeUpdate`
20. `XcodeWrite`

These are the tools documented in detail in `xcode-mcp-tools-reference.md`.

## High-Level Tool Categories

The current catalog groups naturally into five clusters:

### Workspace and Discovery

- `XcodeListWindows`
- `XcodeLS`
- `XcodeGlob`
- `XcodeGrep`
- `XcodeRead`

These are the wrapper's discovery and navigation primitives.

### Build, Test, and Preview

- `BuildProject`
- `GetBuildLog`
- `GetTestList`
- `RunAllTests`
- `RunSomeTests`
- `RenderPreview`
- `ExecuteSnippet`

These are the highest-value wrapper commands for iterative development loops.

### Documentation and Diagnostics

- `DocumentationSearch`
- `XcodeListNavigatorIssues`
- `XcodeRefreshCodeIssuesInFile`

These provide the "understand the project" and "fix the project" surfaces.

### Editing and File Mutation

- `XcodeWrite`
- `XcodeUpdate`
- `XcodeMV`
- `XcodeMakeDir`
- `XcodeRM`

These are powerful and need wrapper-level guardrails.

### Project and IDE State

- `XcodeListWindows`

This is the key preflight tool because most other tools require a valid `tabIdentifier`.

## Important Precondition: Open Xcode Workspace Windows

During this research pass, the live `XcodeListWindows` tool returned:

- `No workspace windows found`

That matters because it shows that the Xcode MCP server can be reachable while still being operationally unusable for workspace-scoped tasks until Xcode has an open workspace window.

For wrapper design, that implies a required preflight phase:

1. Check whether Xcode is reachable.
2. Check whether a workspace/project window exists.
3. Resolve the relevant `tabIdentifier`.
4. Only then expose build/test/file-edit flows.

## Path Semantics You Must Keep Straight

The current tool set mixes at least two path models:

- Filesystem paths
- Xcode project navigator paths

Examples:

- `XcodeRead`, `XcodeWrite`, `XcodeUpdate`, `XcodeLS`, `XcodeGlob`, `XcodeGrep`, `XcodeMV`, and `XcodeRM` explicitly operate on Xcode project organization paths, not raw filesystem structure.
- Some tools take absolute filesystem paths, such as build-log filters or local file paths in coverage/build outputs.

A wrapper should surface this distinction explicitly instead of pretending everything is just a filesystem path.

## What Apple Publicly Says the Tooling Can Do

Apple's public docs for coding intelligence say agentic coding tools enabled in Xcode can access capabilities such as:

- building the app
- searching Apple documentation
- adding entitlements
- fixing build errors
- generating previews and playgrounds

That public positioning matches the current live tool catalog even though Apple does not publish a nice full public tool matrix.

## Practical Wrapper Conclusion

The wrapper should think in terms of:

- transport is simple
- window/tab discovery is mandatory
- tool routing is rich
- path and scope semantics must be normalized
- editing tools need safety rails

That is the core design takeaway from the current Xcode MCP surface.
