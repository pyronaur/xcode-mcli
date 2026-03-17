# Xcode MCP Reverse Engineering Notes

This file captures observations that are useful for wrapper design but are either:

- not stated directly in Apple's public docs
- only partially documented
- observed locally in this environment

## 1. The Current Session Exposes `xcode` Tools Without a Matching External Codex MCP Entry

Observed locally:

- the session has an `xcode` MCP tool namespace
- `codex mcp get xcode --json` returned `No MCP server named 'xcode' found.`

Inference:

- the `xcode` MCP surface available to this session is integrated into the current environment and is not coming from a user-managed external Codex MCP registration

Wrapper implication:

- do not assume the current integrated session shape tells you how an external `codex mcp` config is stored
- for the wrapper project, configure `mcporter` directly against `xcrun mcpbridge`

## 2. No Workspace Windows Is a Real Runtime State

Observed locally:

- `XcodeListWindows` returned `No workspace windows found`

Inference:

- Xcode MCP availability and useful workspace access are different states

Wrapper implication:

- "connected" is not enough
- the wrapper needs a workspace/tab readiness check

## 3. Resource Channels Are Not Currently Usable Here

Observed locally:

- listing MCP resources for `xcode` failed with `Unexpected response type`
- listing MCP resource templates for `xcode` failed with `Unexpected response type`

Wrapper implication:

- do not build the wrapper around MCP resources/templates for the first version
- treat tool calls as the stable path

## 4. `DocumentationSearch` Has At Least One Query-Escaping Edge Case

Observed locally:

- a `DocumentationSearch` query containing `tool's` failed with an internal SQL preparation error

Inference:

- there is at least one escaping or indexing bug in the current documentation search implementation

Wrapper implication:

- sanitize or retry problematic punctuation in search text
- avoid assuming every query string is safe as-is

## 5. `mcpbridge` Binary Strings Reveal More Operational Detail Than the Public Help Text

Selected strings found locally:

- `Starting bridge for tool service pid %d, session %s`
- `Bridge session ended`
- `mcpbridge endpoint injection`

Evidence-backed inference:

- the bridge likely negotiates a lower-level tool-service endpoint and binds it to a per-session context

Caution:

- this is not public API documentation
- do not code against internal strings

## 6. Apple's Public Docs Describe Capabilities More Broadly Than They Expose Schematically

Apple public docs say enabled agentic tools can do things like:

- build the app
- search Apple docs
- add entitlements
- fix build issues

The live tool list provides the actual actionable surface.

Wrapper implication:

- public docs tell you what the product is for
- live tool schemas tell you what you can safely implement

## 7. Secondary-Source Warning About Output Schema Compliance

Apple Developer Forums search results surfaced a report that `XcodeListWindows` advertises an output schema but returns only `content` text rather than structured data in `structuredContent`.

Status:

- secondary source
- not validated in this pass

Why it matters:

- if true, wrappers should be defensive about preferring text extraction over assuming perfect structured payloads

## 8. Best Current Mental Model

The safest current mental model is:

- Xcode MCP transport is simple
- Xcode readiness is not guaranteed
- tool inputs are well-described
- tool outputs may need empirical validation
- wrapper value comes from normalization, not from inventing a new backend
