# Sources

This ledger records the sources used for the research pack, grouped by confidence level.

## Official Apple Sources

### Apple Developer Documentation

1. `Giving external agentic coding tools access to Xcode`
   URL: `https://developer.apple.com/documentation/xcode/giving-agentic-coding-tools-access-to-xcode`
   Local snapshot: `vendor/apple/giving-agentic-coding-tools-access-to-xcode.md`
   Used for:
   - Xcode enablement flow
   - `Xcode Tools` setting
   - official `xcrun mcpbridge` registration examples for Codex and Claude

2. `Writing code with intelligence in Xcode`
   URL: `https://developer.apple.com/documentation/xcode/writing-code-with-intelligence-in-xcode`
   Local snapshot: `vendor/apple/writing-code-with-intelligence-in-xcode.md`
   Used for:
   - public capability framing
   - confirmation that agentic tools can build apps, search Apple docs, and participate in code-modification flows

## Local Machine Evidence

1. `xcrun mcpbridge --help`
   Local capture: `research/mcpbridge-help.txt`
   Used for:
   - documented CLI flags
   - documented environment variables
   - documented PID auto-detection behavior

2. `xcodebuild -version`
   Local capture: `research/xcode-version.txt`
   Used for:
   - current Xcode version and build

3. `xcrun --find mcpbridge`
   Local capture: `research/mcpbridge-path.txt`
   Used for:
   - actual bridge binary path on this machine

4. `strings` against the bridge binary
   Local capture: `research/mcpbridge-strings.txt`
   Used for:
   - reverse-engineering hints only
   - not treated as public API contract

5. Live `xcode` MCP tool definitions available in this session
   Used for:
   - complete tool inventory
   - parameter names
   - required/optional classification
   - defaults, enums, and descriptions

6. Live `XcodeListWindows` result in this session
   Observed result:
   - `No workspace windows found`
   Used for:
   - wrapper preflight conclusions

7. Live `mcporter` daemon-backed Xcode workflow in this workspace
   Observed results:
   - named `xcode` server with `lifecycle: "keep-alive"` worked through `mcporter daemon`
   - repeated `mcporter call xcode.XcodeListWindows` calls returned the same workspace window
   - daemon status showed `xcode: connected`
   - ad hoc one-shot `--stdio "xcrun mcpbridge"` usage corresponded to repeated Xcode consent prompts
   Used for:
   - daemon usage recommendation
   - wrapper operational guidance
   - rejection of ad hoc stdio as the default path for repeated usage

## Official `mcporter` Sources

Vendored snapshot copied from:

- repo: `https://github.com/steipete/mcporter`
- npm package version observed locally: `0.7.3`

Local copies:

- `vendor/mcporter/README.md`
- `vendor/mcporter/mcporter.schema.json`
- `vendor/mcporter/docs/*`

Most relevant docs for the wrapper objective:

- `vendor/mcporter/docs/config.md`
- `vendor/mcporter/docs/cli-generator.md`
- `vendor/mcporter/docs/emit-ts.md`
- `vendor/mcporter/docs/adhoc.md`

## Local Template Sources

1. `command-template` local repository
   Path: `/Users/n14/Projects/Open-Source/command-template`
   Used for:
   - repository shape for the OSS CLI spec
   - command registration model
   - Commander + Zod command contract
   - testing and exit-code expectations

## Secondary Sources

These were used only as secondary evidence and are not treated as stable API contracts.

1. Apple Developer Forums search results referring to Xcode-managed Codex and Claude config directories
   Used for:
   - adjacent-config awareness

2. Apple Developer Forums search result snippet about `structuredContent` behavior
   Used for:
   - defensive wrapper guidance around output parsing

## Confidence Rules Used In This Pack

- Highest confidence:
  official Apple docs and direct local command output

- High confidence:
  live session tool signatures exposed directly by the current environment

- Medium confidence:
  evidence-backed inference from binary strings or observed runtime behavior

- Low confidence:
  forum snippets and search-result fragments not validated in a live project
