# Xcode MCP Research Pack

This directory is a documentation-first research bundle for implementing a `mcporter`-based wrapper around Apple's Xcode-provided MCP server.

Scope:

- This pack is about Apple's Xcode MCP server exposed through `xcrun mcpbridge`.
- It is intentionally not about `xcodebuildmcp`.
- The goal is wrapper design and implementation prep, not end-user onboarding.

## Document Map

- `xcode-mcp-overview.md`
  What Xcode MCP is, how Apple says to enable it, what the local machine exposes, and the current live tool inventory.

- `xcode-mcp-config.md`
  Every currently known configuration surface for the Xcode MCP bridge: Xcode UI enablement, bridge launch model, environment variables, agent registration, and wrapper-facing config implications.

- `xcode-mcp-tools-reference.md`
  Exhaustive reference for the currently exposed Xcode MCP tools in this session, including every input property, type, default, enum, and wrapper-relevant note.

- `mcporter-wrapper-notes.md`
  Concrete notes for building a wrapper around Xcode MCP with `mcporter`, including recommended config shapes, wrapper ergonomics, and open verification points.

- `mcporter-daemon-xcode.md`
  Validated daemon-based approach for Xcode MCP with `mcporter`, including config, commands, observed behavior, and why it avoids repeated Xcode consent prompts better than ad hoc calls.

- `oss-v1-spec.md`
  Stable public CLI spec based on `command-template`, with direct `xcrun mcpbridge` integration, owned daemon, and full 1:1 Xcode MCP command mapping.

- `xcode-mcp-reverse-engineering.md`
  Local observations and evidence-backed inferences that go beyond the public Apple docs.

- `research/sources.md`
  Source ledger with provenance and confidence level.

- `research/`
  Raw local evidence captured from this machine: `mcpbridge` help, binary path, Xcode version, and selected binary strings.

- `vendor/mcporter/`
  Snapshot of upstream `mcporter` docs and schema copied into this workspace for offline reference.

- `vendor/apple/`
  Saved Apple documentation pages used during this research pass.

## Short Conclusions

- Apple's Xcode MCP server is bridged over stdio by `xcrun mcpbridge`.
- The bridge itself exposes a very small configuration surface. The main documented knobs are Xcode's `Xcode Tools` UI toggle plus the environment variables `MCP_XCODE_PID` and `MCP_XCODE_SESSION_ID`.
- The richer surface is the tool catalog, not bridge configuration.
- For repeated CLI use, the daemon-backed named-server approach is materially better than ad hoc `--stdio "xcrun mcpbridge"` calls because it keeps one long-lived client process connected to Xcode.
- For a `mcporter` wrapper, the main work is not transport setup. The main work is tool shaping, workspace/tab discovery, path normalization, and ergonomics around destructive/editing operations.
