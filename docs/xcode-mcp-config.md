# Xcode MCP Config

This file documents every currently known configuration surface for Apple's Xcode MCP bridge and separates three different things that are easy to conflate:

1. Xcode's own enablement settings
2. `mcpbridge` launch-time configuration
3. client-side wrapper configuration such as `mcporter`

## 1. Xcode-Side Enablement

Apple's documented UI prerequisite is:

- `Xcode > Settings > Intelligence > Model Context Protocol > Xcode Tools`

If `Xcode Tools` is off, the external bridge has nothing useful to connect to.

This is the primary Xcode-side configuration value that Apple documents publicly.

## 2. `mcpbridge` CLI Surface

The command itself is:

```bash
xcrun mcpbridge
```

Documented options:

- `-h`
- `-help`
- `--help`

There are no documented operational flags for transport mode, host, port, window selection, output format, or tool filtering.

That means almost all configuration is done through environment variables rather than CLI flags.

## 3. `mcpbridge` Environment Variables

`xcrun mcpbridge --help` documents two environment variables.

### `MCP_XCODE_PID`

Type:

- stringified process ID

Purpose:

- select the exact Xcode process to connect to

Official behavior:

- Optional.
- If unset, `mcpbridge` auto-detects the target Xcode process.

Documented fallback logic:

1. If exactly one Xcode process is running, use that one.
2. If multiple Xcode processes are running, use `xcode-select` to determine which Xcode is selected and connect to that one.
3. If no Xcode processes are found, exit with error.

Wrapper implication:

- If multiple Xcode versions or multiple live Xcode instances are common in your environment, set `MCP_XCODE_PID` explicitly.
- If your wrapper wants deterministic behavior, do not rely on fallback auto-selection.

### `MCP_XCODE_SESSION_ID`

Type:

- UUID string

Purpose:

- identify an Xcode tool session

What Apple publicly documents:

- `Optional. A UUID identifying an Xcode tool session.`

What is still unclear from public docs:

- session lifetime
- whether the session is purely tracing/telemetry-related or behavior-affecting
- whether session reuse impacts caching, authorization, or conversation affinity

Wrapper implication:

- treat it as an advanced passthrough field
- do not make wrapper correctness depend on it unless later live validation proves that necessary

## 4. Raw Local `mcpbridge` Evidence

The bridge help captured on this machine is stored in:

- `research/mcpbridge-help.txt`

Selected binary strings captured from the bridge are stored in:

- `research/mcpbridge-strings.txt`

Interesting strings found there include:

- `MCP_XCODE_PID not set, using selected Xcode process: %d`
- `MCP_XCODE_PID not set, using the only running Xcode process: %d`
- `MCP_XCODE_PID not set, multiple Xcode processes found, and could not determine which one is selected via xcode-select`
- `MCP_XCODE_PID environment variable not set and no running Xcode processes found`
- `Starting bridge for tool service pid %d, session %s`
- `Bridge session ended`
- `mcpbridge endpoint injection`

These are not public API promises, but they are useful reverse-engineering evidence.

## 5. Agent Registration Config

Apple's official external-agent registration pattern is a stdio MCP server pointed at `xcrun mcpbridge`.

Examples:

```bash
codex mcp add xcode -- xcrun mcpbridge
claude mcp add --transport stdio xcode -- xcrun mcpbridge
```

This is client-side configuration, not Xcode server configuration.

## 6. `mcporter` Config for Xcode MCP

For `mcporter`, the minimal useful server definition is a stdio command:

```json
{
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP via xcrun mcpbridge",
      "command": "xcrun",
      "args": ["mcpbridge"]
    }
  }
}
```

If you need deterministic instance targeting:

```json
{
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP pinned to one Xcode process",
      "command": "xcrun",
      "args": ["mcpbridge"],
      "env": {
        "MCP_XCODE_PID": "12345"
      }
    }
  }
}
```

If you want session tagging passthrough:

```json
{
  "mcpServers": {
    "xcode": {
      "description": "Apple Xcode MCP with explicit session identifier",
      "command": "xcrun",
      "args": ["mcpbridge"],
      "env": {
        "MCP_XCODE_SESSION_ID": "11111111-2222-3333-4444-555555555555"
      }
    }
  }
}
```

## 7. Which `mcporter` Config Fields Matter Most Here

For Xcode MCP, the highest-value `mcporter` fields are:

- `description`
  For operator clarity only.

- `command`
  Required. Use `xcrun`.

- `args`
  Required. Use `["mcpbridge"]`.

- `env`
  Important only if you want to pin PID or pass session ID.

- `lifecycle`
  Potentially useful if you choose to keep the bridge warm, but this needs live validation before standardizing.

- `logging`
  Useful while building the wrapper.

Most HTTP-oriented `mcporter` fields are irrelevant here:

- `baseUrl`
- `url`
- `serverUrl`
- `headers`
- `auth`
- `oauthRedirectUrl`
- `oauthScope`

The Xcode bridge is stdio, not HTTP.

## 8. Adjacent Config Surfaces That Are Easy To Confuse With Xcode MCP

These are related to Xcode intelligence or agent execution, but they are not the bridge configuration itself.

### AGENTS/CLAUDE Hints

Apple explicitly says you can add hints about Xcode and the project to files such as:

- `AGENTS.md`
- `CLAUDE.md`

This affects agent behavior, not bridge transport behavior.

### Xcode-Managed Agent Config Directories

Apple Developer Forums search results surfaced references to Xcode-managed agent config locations such as:

- `~/Library/Developer/Xcode/CodingAssistant/codex/config.toml`
- `~/Library/Developer/Xcode/CodingAssistant/ClaudeAgentConfig/config.json`
- project-local `.codex/config.toml`

Treat those as secondary-source observations, not stable public Xcode MCP API.

They may matter if you later build tooling that runs inside Xcode's own coding assistant environment. They do not appear necessary for an external `mcporter` wrapper that talks to `xcrun mcpbridge`.

## 9. Current Known Config Reality

The public configuration surface for Apple's Xcode MCP bridge is small:

- one Xcode UI toggle
- two documented environment variables
- stdio registration in the client

That is the full known bridge-level config story from current official docs plus local evidence.

Everything else in the wrapper will be higher-level policy:

- how to select tabs
- how to normalize paths
- how to present tool commands
- how aggressively to guard edits and deletes
