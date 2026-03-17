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

If it fails with `Failed to call xcrun mcpbridge --help.`:

- enable `Xcode Tools` in `Settings > Intelligence`
- run `xcode-mcli setup` again

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
xcode-mcli files read --tab-identifier windowtab1 --file-path Path/To/File.swift
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
xcode-mcli files write --tab-identifier windowtab1 --file-path Path/To/File.swift --content 'let x = 1' --yes
```

## `files mkdir` or other mutating commands fail with an Xcode tool error

Some Xcode mutating tools depend on project structure resolution inside the active workspace.

If `files mkdir` reports a message telling you to run `XcodeLS` first, warm the structure with:

```bash
xcode-mcli files ls --path .
```

Then retry the mutating command against a path inside an existing project-recognized subtree.

If Xcode returns a group-resolution failure for a path that is not already represented in the project structure, use a disposable path under an existing group such as a known source folder.

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
