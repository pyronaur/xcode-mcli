# `mcporter` Wrapper Notes For Xcode MCP

This file translates the research into concrete wrapper-design guidance.

## Core Position

For Apple's Xcode MCP, `mcporter` should be treated as:

- a transport and ergonomics layer
- a config layer
- an optional codegen layer

It should not be treated as the source of truth for Xcode behavior.

The Xcode behavior source of truth is:

- Xcode itself
- `xcrun mcpbridge`
- the live Xcode MCP tool catalog

## Minimal `mcporter` Definition

Recommended baseline entry:

```json
{
  "$schema": "https://raw.githubusercontent.com/steipete/mcporter/main/mcporter.schema.json",
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP via xcrun mcpbridge",
      "command": "xcrun",
      "args": ["mcpbridge"]
    }
  }
}
```

## PID-Pinned Variant

If the wrapper needs deterministic routing to one Xcode instance:

```json
{
  "$schema": "https://raw.githubusercontent.com/steipete/mcporter/main/mcporter.schema.json",
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP pinned to a specific Xcode process",
      "command": "xcrun",
      "args": ["mcpbridge"],
      "env": {
        "MCP_XCODE_PID": "12345"
      }
    }
  }
}
```

## Why `mcporter` Is Useful Here

Relevant `mcporter` capabilities for this wrapper project:

- config normalization
- stdio server execution
- TypeScript client generation via `emit-ts`
- single-purpose wrapper generation via `generate-cli`
- server listing and schema display
- daemon-backed keep-alive lifecycle management

The vendored upstream `mcporter` docs are in `vendor/mcporter/`.

Most relevant vendored docs:

- `vendor/mcporter/docs/config.md`
- `vendor/mcporter/docs/cli-reference.md`
- `vendor/mcporter/docs/cli-generator.md`
- `vendor/mcporter/docs/emit-ts.md`
- `vendor/mcporter/docs/adhoc.md`

## Validated Operational Pattern

The validated operational pattern in this workspace is:

1. configure a named `xcode` server
2. use `command: "xcrun"` and `args: ["mcpbridge"]`
3. set `lifecycle: "keep-alive"`
4. start the `mcporter` daemon
5. call `xcode.<ToolName>` through the named server

This worked materially better than ad hoc one-shot calls.

Validated example:

```json
{
  "$schema": "https://raw.githubusercontent.com/steipete/mcporter/main/mcporter.schema.json",
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP via xcrun mcpbridge",
      "command": "xcrun",
      "args": ["mcpbridge"],
      "lifecycle": "keep-alive"
    }
  }
}
```

Validated commands:

```bash
mcporter daemon start
mcporter call xcode.XcodeListWindows
mcporter call xcode.XcodeListWindows
```

Why this matters:

- ad hoc `mcporter call --stdio "xcrun mcpbridge" ...` launches a new client process for each call
- Xcode then sees a new client PID and can re-prompt for permission repeatedly
- daemon-backed keep-alive reuses a long-lived client process and keeps the Xcode connection warm

See `mcporter-daemon-xcode.md` for the full write-up.

## Recommended Wrapper Architecture

## Phase 1: Thin Wrapper

Start with a thin wrapper that does only four things:

1. connects to `xcrun mcpbridge`
2. discovers windows and tabs
3. normalizes repetitive parameters like `tabIdentifier`
4. adds safer UX for mutating tools

Do not add speculative abstraction before validating the live output shapes.

## Phase 2: Command Families

Recommended command grouping:

- `xcode windows`
- `xcode ls`
- `xcode glob`
- `xcode grep`
- `xcode read`
- `xcode build`
- `xcode build-log`
- `xcode tests list`
- `xcode tests run`
- `xcode preview`
- `xcode snippet`
- `xcode docs search`
- `xcode issues`
- `xcode mkdir`
- `xcode mv`
- `xcode rm`
- `xcode write`
- `xcode replace`

## Phase 3: Stateful Convenience

After validation, consider caching:

- active `tabIdentifier`
- preferred workspace/project window
- recent file paths
- recent test specifiers

But do this only after confirming how stable tab identifiers are across Xcode window changes.

## Recommended Preflight Sequence

Every wrapper session should probably do this:

1. call `XcodeListWindows`
2. verify there is at least one workspace/project window
3. choose or cache a `tabIdentifier`
4. only then expose workspace-scoped commands

If step 2 fails, the wrapper should give a crisp error like:

- open a project in Xcode
- ensure `Xcode Tools` is enabled in Xcode settings
- if multiple Xcode instances exist, consider setting `MCP_XCODE_PID`

## Safety Policy Recommendations

Recommended wrapper defaults:

- safe by default
- destructive only when explicit
- no silent overwrites
- no silent deletions

Concrete suggestions:

- require `--yes` or `--force` for `XcodeRM`
- show `deleteFiles=true` loudly because that is the tool default
- require explicit `--overwrite` mapping before `XcodeWrite` replaces an existing file
- require explicit `--replace-all` before `XcodeUpdate replaceAll=true`

## Path Policy Recommendations

The wrapper should expose path type clearly.

Suggested naming:

- `project-path`
  For Xcode project navigator paths.

- `fs-path`
  For raw filesystem paths.

Do not use just `--path` everywhere unless the command itself is unambiguous.

## First-Order Unknowns To Validate Later

These were not fully discoverable in this pass because the current session had no open Xcode workspace window:

1. exact output shapes for each tool
2. tab/window payload structure returned by `XcodeListWindows`
3. build/test result structure details
4. preview/snapshot payload details
5. stability of `tabIdentifier` across Xcode restarts
6. practical meaning of `MCP_XCODE_SESSION_ID`
7. whether keep-alive lifecycle helps reliability for tools beyond `XcodeListWindows`

The keep-alive question is now partially answered:

- it improved the repeated-call workflow for `XcodeListWindows`
- it still needs broader validation across build, test, preview, read, and mutation tools

Those broader cases should still be validated with a live Xcode project before wrapper API hardening.

## Important Negative Conclusion

Do not design around `xcodebuildmcp`.

For this project, the wrapper target is the Apple Xcode MCP bridge and its native tool catalog.
