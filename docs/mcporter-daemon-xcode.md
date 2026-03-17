# `mcporter` Daemon Approach For Xcode MCP

This file documents the working approach validated in this workspace for using Apple's Xcode MCP server through `mcporter` without getting repeated Xcode consent prompts on every single command.

## Short Version

Do not use ad hoc one-shot calls like this for repeated Xcode work:

```bash
mcporter call --stdio "xcrun mcpbridge" XcodeListWindows
```

Use a named `xcode` server with:

- `command: "xcrun"`
- `args: ["mcpbridge"]`
- `lifecycle: "keep-alive"`

Then start the `mcporter` daemon and call the named server:

```bash
mcporter daemon start
mcporter call xcode.XcodeListWindows
mcporter call xcode.XcodeListWindows
```

That keeps the Xcode connection warm through the daemon and avoids the worst consent-prompt behavior caused by a new client PID for each call.

## Why Ad Hoc Calls Cause Repeated Xcode Consent Prompts

This one-shot pattern:

```bash
mcporter call --stdio "xcrun mcpbridge" XcodeListWindows
```

spawns a fresh `mcporter` process for each command.

From Xcode's point of view, that means:

- new agent process
- new PID
- new request to access Xcode tools

So Xcode keeps asking for permission again.

The user-observed symptom in this session was the recurring prompt:

- `Allow "mcporter" to access Xcode?`

with a different Node PID each time.

## Working Config

Validated project-local config:

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

Project path used in this workspace:

- `config/mcporter.json`

## Commands Used

Setup:

```bash
mkdir -p config
mcporter daemon start
mcporter daemon status
```

Calls:

```bash
mcporter call xcode.XcodeListWindows
mcporter call xcode.XcodeListWindows
mcporter call xcode.XcodeListWindows
```

## Observed Results

Daemon startup succeeded:

```text
Daemon started for 1 server(s).
```

Daemon status after startup:

```text
Daemon pid 6242 — socket: /Users/n14/.mcporter/daemon/daemon-6d24d531134a.sock
- xcode: idle
```

After successful calls:

```text
Daemon pid 6242 — socket: /Users/n14/.mcporter/daemon/daemon-6d24d531134a.sock
- xcode: connected
```

The repeated `XcodeListWindows` result was stable:

```json
{
  "message": "* tabIdentifier: windowtab1, workspacePath: /Users/n14/Projects/iOS/countdown/Countdown.xcworkspace\n"
}
```

## Important Runtime Quirk Observed

The first daemon-backed call logged this retry:

```text
[mcporter] Restarting 'xcode' before retrying callTool: MCP error -32600: Tool XcodeListWindows has an output schema but did not return structured content
```

Then it succeeded on retry.

Subsequent calls were fast and succeeded without repeating that restart log.

Implication:

- the daemon approach works
- `XcodeListWindows` currently exposes at least one output-shape compatibility quirk with `mcporter`
- the wrapper should be defensive about text-only payloads even when a tool advertises structured output

## Recommended Usage Pattern

For humans:

1. define a named `xcode` server in `mcporter`
2. set `lifecycle` to `keep-alive`
3. start the daemon once
4. run repeated calls against `xcode.<ToolName>`

For a wrapper CLI:

1. require a named `xcode` server, not ad hoc stdio
2. ensure daemon is started during setup or first run
3. preflight with `XcodeListWindows`
4. reuse the same daemon-backed connection for all subsequent commands

## Recommended Wrapper Policy

The wrapper should standardize on:

- named server
- daemon-backed lifecycle
- no ad hoc stdio for normal operation

Ad hoc stdio can still be useful for debugging, but it should not be the default operator path.

## Suggested Setup Doc Snippet

If the wrapper needs a compact install/setup section, this is the concise version:

```bash
mkdir -p config
cat > config/mcporter.json <<'EOF'
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
EOF

mcporter daemon start
mcporter call xcode.XcodeListWindows
```

## Final Conclusion

For repeated Xcode MCP usage through `mcporter`, the daemon is not an optional optimization. It is the practical approach that makes the workflow usable.
