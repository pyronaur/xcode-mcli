# Compatibility

## Objective

`xcode-mcli` can verify its Xcode MCP compatibility by diffing the live discovered MCP surface against a pinned baseline snapshot.

The compatibility contract is the normalized result of:

- `initialize`
- `tools/list`
- `prompts/list`
- `resources/list`

The pinned Apple Xcode 26.3 baseline is:

```text
compat/xcode-mcp/apple-xcode-26.3.surface.json
```

That snapshot currently records:

- protocol version `2025-06-18`
- `20` tools
- `0` prompts
- `0` resources

## Commands

Capture the current live surface:

```bash
xcode-mcli surface snapshot
```

Write a canonical snapshot file:

```bash
xcode-mcli surface snapshot --output-file compat/xcode-mcp/apple-xcode-26.3.surface.json
```

Verify the current Xcode MCP surface against the pinned 26.3 baseline:

```bash
xcode-mcli surface verify --baseline-file compat/xcode-mcp/apple-xcode-26.3.surface.json
```

Convenience npm scripts:

```bash
npm run compat:xcode-mcp:snapshot
npm run compat:xcode-mcp:pin-26.3
npm run compat:xcode-mcp:verify
```

## Verification Behavior

`surface snapshot` normalizes the discovered surface before printing or writing it:

- sorts tools, prompts, and resources by `name`
- sorts object keys recursively
- preserves extra server metadata such as `title` and `outputSchema`

`surface verify` compares:

- protocol version
- tool additions, removals, and changed definitions
- prompt additions, removals, and changed definitions
- resource additions, removals, and changed definitions

An exact match exits successfully.

A mismatch exits with a runtime error. In `--json` mode, the error envelope includes structured `error.details` with the categorized diff.

## Upgrade Flow

When a new Xcode release arrives:

1. Run `npm run compat:xcode-mcp:verify`.
2. If it passes, the pinned baseline still matches the live Xcode MCP contract.
3. If it fails, inspect the categorized diff.
4. Confirm whether the change is additive, behavioral, or breaking for the CLI.
5. Update `xcode-mcli` if the wrapper needs to support the new contract.
6. Re-pin the baseline with `npm run compat:xcode-mcp:pin-26.3` or a new versioned snapshot path.

For machine-readable inspection:

```bash
xcode-mcli surface verify \
  --baseline-file compat/xcode-mcp/apple-xcode-26.3.surface.json \
  --json
```
