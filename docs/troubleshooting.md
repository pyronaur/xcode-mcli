# Troubleshooting

## `setup` fails to locate `mcpbridge`

Run:

```bash
xcode-mcli setup
```

If it fails with `Failed to locate xcrun mcpbridge.`:

- confirm Xcode is installed
- confirm `Xcode Tools` is enabled in `Settings > Intelligence`
- confirm `xcrun` resolves from your shell

## `windows list` returns no useful workspace

Make sure Xcode is open with a workspace or project window.

Then run:

```bash
xcode-mcli windows list
```

## A tab-aware command fails because no active window is selected

Use one of these paths:

```bash
xcode-mcli windows list
xcode-mcli windows use --tab-identifier windowtab1
```

Or pass the tab directly on the command:

```bash
xcode-mcli files read --tab-identifier windowtab1 --file-path App/Main.swift
```

## Multiple Xcode windows are open

Pick one explicitly:

```bash
xcode-mcli windows list
xcode-mcli windows use --tab-identifier windowtab1
```

## Xcode permission prompts appear

The first tool-backed command may trigger an Xcode permission prompt for the CLI process.

If you change terminals, shells, or Node installations, macOS may ask again because the calling process identity changed.

## The daemon looks stale

Restart it:

```bash
xcode-mcli daemon restart
```

Or stop and start it:

```bash
xcode-mcli daemon stop
xcode-mcli daemon start
```

Inspect status:

```bash
xcode-mcli daemon status
```

## JSON output is mixed with diagnostic text

`--json` writes the stable envelope to `stdout`.

For tool-backed commands, `--verbose` writes the tool name to `stderr`.

This keeps `stdout` parseable:

```bash
xcode-mcli windows list --json --verbose
```

## Mutating commands fail with a confirmation error

These commands require `--yes`:

- `files rm`
- `files update`
- `files write`
- `files mv --overwrite-existing`

Example:

```bash
xcode-mcli files write --tab-identifier windowtab1 --file-path App/Main.swift --content 'let x = 1' --yes
```

## Inspecting daemon state

The default state root is:

```text
~/Library/Application Support/xcode-mcli
```

Important files:

- `daemon.sock`
- `daemon.pid`
- `daemon.log`
- `state.json`
