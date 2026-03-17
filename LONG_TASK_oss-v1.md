# Long Task: Implement OSS V1 `xcode-mcli`

## Objective

Implement the CLI defined in `docs/oss-v1-spec.md` as a stable macOS-only Node 25 + npm + TypeScript tool that talks directly to `xcrun mcpbridge`, owns its daemon lifecycle, exposes the full current Xcode MCP tool surface with a 1:1 CLI mapping, and ships with CLI-surface tests plus end-user docs.

## Source Inputs

- `docs/oss-v1-spec.md`
- `docs/xcode-mcp-overview.md`
- `docs/xcode-mcp-tools-reference.md`
- `docs/xcode-mcp-config.md`
- `docs/mcporter-daemon-xcode.md`
- `/Users/n14/Projects/Open-Source/command-template`

## User Instructions Captured For This Task

- Implement `docs/oss-v1-spec.md` end to end.
- Use the TDD process for the entire implementation.
- Use a vertical-slice approach.
- Prefer deep modules.
- Prefer AFK slices over HITL slices where possible.
- Prepare for long-task execution before implementation begins.

## Scope

In scope:

- Convert the repo from template form into `xcode-mcli`.
- Build a direct Xcode MCP bridge client.
- Build a daemon-backed CLI execution path.
- Add every v1 command in the spec, including helper commands.
- Add text and JSON output contracts.
- Add guardrails for mutating commands.
- Add CLI-surface tests.
- Add top-level docs required by the spec.

Out of scope:

- Generic MCP client support.
- Editor integrations.
- Homebrew packaging.
- launchd integration.
- Shell completion.
- Non-macOS support.

## Deep Module Strategy

The implementation must hide complexity behind a few narrow boundaries.

### Module A: Xcode Bridge Client

Interface:

- `createXcodeBridgeClient(input): Promise<XcodeBridgeClient>`
- `XcodeBridgeClient.listTools(): Promise<...>`
- `XcodeBridgeClient.callTool(input): Promise<...>`
- `XcodeBridgeClient.close(): Promise<void>`

Implementation hidden behind this interface:

- stdio spawn
- MCP initialize flow
- JSON-RPC framing
- request/response correlation
- tool output normalization
- bridge crash handling

### Module B: Daemon Host

Interface:

- `startDaemon(input): Promise<...>`
- `stopDaemon(input): Promise<...>`
- `readDaemonStatus(input): Promise<...>`
- `sendDaemonRequest(input): Promise<...>`

Implementation hidden behind this interface:

- Unix socket server
- PID and socket file management
- log file management
- daemon process supervision
- state persistence
- bridge reuse across commands

### Module C: Tab Resolver

Interface:

- `resolveTabIdentifier(input): Promise<string>`
- `setActiveTabIdentifier(input): Promise<void>`
- `readCachedTabIdentifier(input): Promise<string | null>`

Implementation hidden behind this interface:

- explicit flag precedence
- cached tab behavior
- single-window auto-selection
- multiple-window failure messaging

### Module D: Command Presenter

Interface:

- `printCommandResult(input): void`
- `printCommandError(input): never`

Implementation hidden behind this interface:

- text formatting
- stable JSON envelope
- tool-specific default text rendering
- `--verbose` behavior
- stable exit semantics

The command layer should stay thin. Commands validate flags, call one or two deep modules, and return.

## Progress Check

The long task is progressing correctly only if all of these remain true:

1. There is one primary bridge path: CLI command -> daemon client -> daemon host -> Xcode bridge client -> Xcode MCP tool.
2. Every completed slice is end-to-end and verifiable from the CLI surface.
3. New code increases capability by extending the existing deep modules instead of duplicating transport, daemon, resolution, or presentation logic.
4. Each stable slice is verified with the repo `Waypoint Gate` before a commit.

## Done Gate

The long task is done only when all of these are true:

1. Every currently documented Xcode MCP tool in `docs/oss-v1-spec.md` is reachable through one stable CLI command.
2. The daemon is the default execution path for regular commands and repeated calls reuse one daemon-backed bridge session.
3. The tab resolution policy matches the spec.
4. Mutating commands enforce explicit confirmation.
5. Text output is concise and JSON output uses the stable wrapper envelope.
6. `README.md`, `docs/api-reference.md`, `docs/setup.md`, and `docs/troubleshooting.md` reflect present behavior.
7. `make verify` passes.

## Iteration Loop

Work one checklist item at a time.

For each slice:

1. Confirm the slice boundary and intended demo path.
2. Choose one observable CLI behavior inside that slice as the next tracer bullet.
3. Add or update the narrowest CLI-surface test that proves only that behavior and watch it fail for the right reason.
4. Implement only the smallest code change required to make that single test pass.
5. Refactor only while green, keeping complexity inside the deep modules and keeping the command surface thin.
6. Repeat the red-green-refactor loop one behavior at a time until the full slice path is complete.
7. Update docs required for the changed behavior.
8. Run the `Waypoint Gate`.
9. Check the `Waypoint Commit Gate`.
10. Commit immediately using the `Commit Procedure`.

## Waypoint Gate

- `make verify`

## Waypoint Commit Gate

A slice may be committed only when all of these are true:

1. The slice is a complete vertical path through the affected layers.
2. The slice is demoable or verifiable on its own.
3. The checklist item for that slice is fully complete.
4. The `Waypoint Gate` passes with the slice changes in place.
5. The staged diff contains only the verified slice changes you made.

## Commit Procedure

When a stable slice passes the `Waypoint Gate`:

1. Review `git status -sb`.
2. Review the unstaged and staged diff for the slice.
3. Stage only the intended verified slice files or hunks.
4. Re-check the staged diff.
5. Commit immediately using the repo waypoint-flow policy from `~/.waypoint-flow.md`.
6. Run `git status -sb` after the commit to confirm the remaining worktree state.

Commit message rules for this task:

- Use an imperative subject with no trailing period.
- Use a blank line after the subject.
- Use `-` bullets in the body.
- Make the rationale clear in at least one bullet.
- Keep each commit scoped to one verified slice.

## Execution Rules

- Stay AFK-first. Only create a HITL slice when the work cannot be validated or decided locally.
- Use TDD for the entire implementation. Every runtime behavior change starts with a failing CLI-surface test or a failing path test unless a CLI-surface proof is genuinely impossible.
- Keep slices thin. If a slice touches many files, its public behavior must still be narrow and demoable.
- If a planned slice feels like it could produce more than one clean commit, split it before coding.
- Treat `make verify` as a design tool, not a finish-line cleanup step.
- Apply TDD as vertical tracer bullets, not as a bulk "write all tests first" phase.
- Write one behavior test, make it pass with the smallest change, then refactor while green before moving to the next behavior.
- Prefer one deep-module boundary or one small command family per commit.
- Keep command handlers shallow. Push complexity into the deep modules listed above.
- Do not add speculative flags, compatibility shims, or generic MCP abstractions.
- Keep tests at the CLI surface. Test module internals only if a CLI-surface proof is impossible.
- Search local docs before web search. If web search is needed, prefer primary sources and exact errors.
- Follow `AGENTS.md` and `~/.waypoint-flow.md`.
- Commit only verified slices you implemented in this task, and commit each slice immediately after it passes the `Waypoint Commit Gate`.

## Commit Cadence Target

Target 20 to 24 commits for this task unless observed complexity justifies splitting further.

Reasons:

- frequent `make verify` runs keep lint pressure high
- smaller commits make deep-module refactors easier to correct early
- grouped command families are still too broad if they hide multiple independent green paths
- one-test-at-a-time TDD works best when slices are small enough to turn red-green quickly

## TDD Requirements

The implementation follows the TDD process for the full runtime surface.

Rules:

- Start each new observable behavior with one failing test at the CLI surface.
- For bugs, prove the bug first with a failing path test, then fix it, then re-run the test to prove it passes.
- Keep tests behavioral and public-surface-first. Avoid tests for private helpers or transport internals unless no CLI-surface proof exists.
- Do not batch up large groups of tests before implementation.
- Do not batch up large groups of implementation before re-running tests.
- Refactor only after the current failing test is green.
- When a slice contains multiple behaviors, advance them as repeated red-green-refactor cycles, one behavior at a time.
- Keep deep modules honest by testing their behavior through commands wherever feasible.

## Slice Plan

The slices below are ordered to maximize early AFK progress, to create reusable deep modules before broad command coverage, and to keep the repo green often.

### Execution Checklist

Mark a slice complete only after its current implementation passes `make verify` and is waypoint-committed.

- [x] Slice 1: Rebase Template Identity Into `xcode-mcli`
- [x] Slice 2: Add Shared Global Flags And Command Plumbing
- [x] Slice 3: Build MCP JSON-RPC Framing
- [x] Slice 4: Build Xcode Bridge Process + Initialize Flow
- [x] Slice 5: Normalize Tool Output Shapes
- [x] Slice 6: Build Daemon Storage And State Helpers
- [x] Slice 7: Build Daemon Host Lifecycle Commands
- [x] Slice 8: Route Regular Commands Through The Daemon
- [x] Slice 9: Setup Command + Environment Diagnostics
- [x] Slice 10: Windows Listing Path
- [x] Slice 11: Tab Selection And Resolver Path
- [x] Slice 12: Read-Only File Path Part 1
- [x] Slice 13: Read-Only File Path Part 2
- [x] Slice 14: Build And Build-Log Path
- [x] Slice 15: Tests Path
- [x] Slice 16: Docs Search And Snippet Path
- [x] Slice 17: Preview And Issues Path
- [x] Slice 18: Mutating Files Path Part 1
- [x] Slice 19: Mutating Files Path Part 2
- [x] Slice 20: Mutating Files Path Part 3
- [x] Slice 21: Final Documentation Contract
- [ ] Slice 22: Live Real-Xcode Validation

### Slice 1: Rebase Template Identity Into `xcode-mcli`

Type: AFK

Outcome:

- The repo identity is `xcode-mcli`.
- The template sample commands are removed.
- The command framework supports shared global flags and Xcode-oriented command registration.
- The test harness still runs.

Complete path:

- package/bin/core command bootstrap
- top-level help and version behavior
- empty command groups visible in help only if intentionally registered
- CLI-surface tests proving the new executable name and dispatch behavior

Depends on:

- none

### Slice 2: Add Shared Global Flags And Command Plumbing

Type: AFK

Outcome:

- The command framework supports shared global flags and Xcode-oriented command registration.
- Global parsing is proven without depending on the bridge or daemon.

Complete path:

- global `--json`, `--verbose`, and `--tab-identifier` plumbing
- command registration helpers
- CLI-surface tests for top-level parsing and validation

Depends on:

- Slice 1

### Slice 3: Build MCP JSON-RPC Framing

Type: AFK

Outcome:

- The runtime can speak MCP JSON-RPC over stdio to a fake bridge.
- Request correlation and framing are proven independently of Xcode.

Complete path:

- message framing
- request/response correlation
- fake-bridge runtime tests

Depends on:

- Slice 2

### Slice 4: Build Xcode Bridge Process + Initialize Flow

Type: AFK

Outcome:

- The code can spawn `xcrun mcpbridge`, initialize MCP, and list tools through the bridge client interface.

Complete path:

- bridge process spawn
- initialize handshake
- tool discovery
- normalized client boundary tests

Depends on:

- Slice 3

### Slice 5: Normalize Tool Output Shapes

Type: AFK

Outcome:

- Tool output normalization handles structured and text-only responses without leaking shape quirks to commands.

Complete path:

- structured-content success path
- text-only fallback path
- JSON-envelope-facing tests

Depends on:

- Slice 4

### Slice 6: Build Daemon Storage And State Helpers

Type: AFK

Outcome:

- App support paths, pid/socket/log/state files, and stale-state recovery logic exist behind one boundary.

Complete path:

- environment/state-path helpers
- state persistence
- stale PID/socket cleanup tests

Depends on:

- Slice 5

### Slice 7: Build Daemon Host Lifecycle Commands

Type: AFK

Outcome:

- `daemon start|status|stop|restart` works against the real daemon contract.

Complete path:

- daemon host background process
- daemon client RPC
- CLI-surface tests for lifecycle commands

Depends on:

- Slice 6

### Slice 8: Route Regular Commands Through The Daemon

Type: AFK

Outcome:

- Non-daemon commands can connect to the daemon over the Unix socket and reuse the daemon-owned bridge session.

Complete path:

- daemon-backed command RPC path
- bridge reuse behavior
- CLI-surface tests using a fake bridge

Depends on:

- Slice 7

### Slice 9: Setup Command + Environment Diagnostics

Type: AFK

Outcome:

- `setup` validates Xcode bridge prerequisites, creates state storage, and can start the daemon.
- Error messages cover the missing-bridge and missing-Xcode cases.

Complete path:

- `setup` command
- environment probing
- daemon autostart option
- CLI-surface tests for success and failure

Depends on:

- Slice 8

### Slice 10: Windows Listing Path

Type: AFK

Outcome:

- `windows list` works through the daemon-backed bridge path and caches last seen windows.

Complete path:

- `XcodeListWindows`
- daemon state update
- CLI-surface tests for list behavior and output contract

Depends on:

- Slice 8

### Slice 11: Tab Selection And Resolver Path

Type: AFK

Outcome:

- `windows use` works.
- Cached active tab selection and single-window auto-selection work.
- Multi-window failure is explicit and actionable.

Complete path:

- `windows use`
- tab resolver
- CLI-surface tests for explicit, cached, single-window, and multi-window cases

Depends on:

- Slice 10

### Slice 12: Read-Only File Path Part 1

Type: AFK

Outcome:

- `files ls` and `files read` work through one resolver/presenter path.

Complete path:

- 2 commands
- tab resolution integration
- text rendering and JSON output
- CLI-surface tests

Depends on:

- Slice 11

### Slice 13: Read-Only File Path Part 2

Type: AFK

Outcome:

- `files glob` and `files grep` work with the shared read-only file presentation path.

Complete path:

- 2 commands
- repeatable and boolean grep flags
- CLI-surface tests

Depends on:

- Slice 12

### Slice 14: Build And Build-Log Path

Type: AFK

Outcome:

- `project build` and `build log` work.

Complete path:

- 2 commands
- bridge call mapping
- CLI-surface tests

Depends on:

- Slice 11

### Slice 15: Tests Path

Type: AFK

Outcome:

- `tests list`, `tests run-all`, and `tests run-some` work.
- Array/object argument mapping is proven at the CLI surface.

Complete path:

- 3 commands
- object-array flag parsing for `--test`
- CLI-surface tests

Depends on:

- Slice 11

### Slice 16: Docs Search And Snippet Path

Type: AFK

Outcome:

- `docs search` and `snippet execute` work.
- Repeated flag parsing and timeout handling are proven.

Complete path:

- 2 commands
- repeated `--framework`
- timeout coercion
- CLI-surface tests

Depends on:

- Slice 11

### Slice 17: Preview And Issues Path

Type: AFK

Outcome:

- `preview render`, `issues list`, and `issues file` work.
- Severity and filtering flags are validated and presented consistently.

Complete path:

- 3 commands
- shared issues presentation
- preview timeout path
- CLI-surface tests

Depends on:

- Slice 11

### Slice 18: Mutating Files Path Part 1

Type: AFK

Outcome:

- `files mkdir` and `files mv` work.
- Overwrite-specific confirmation guardrails are enforced.

Complete path:

- 2 commands
- `--yes` policy for overwrite path
- CLI-surface tests for safe and unsafe cases

Depends on:

- Slice 12

### Slice 19: Mutating Files Path Part 2

Type: AFK

Outcome:

- `files rm` and `files update` work.
- Required destructive confirmation is enforced.

Complete path:

- 2 commands
- `--yes` policy
- CLI-surface tests for safe and unsafe cases

Depends on:

- Slice 18

### Slice 20: Mutating Files Path Part 3

Type: AFK

Outcome:

- `files write` works.
- `--content-file` convenience is supported.

Complete path:

- 1 command
- content-file convenience path
- CLI-surface tests for safe and unsafe cases

Depends on:

- Slice 19

### Slice 21: Final Documentation Contract

Type: AFK

Outcome:

- The public docs match the implemented CLI.
- The API reference is exhaustive and setup/troubleshooting docs are sufficient for a new user.

Complete path:

- `README.md`
- `docs/api-reference.md`
- `docs/setup.md`
- `docs/troubleshooting.md`

Depends on:

- Slices 1 through 20

### Slice 22: Live Real-Xcode Validation

Type: HITL

Outcome:

- The wrapper is exercised against a live Xcode session with `Xcode Tools` enabled.
- Known prompt/session behaviors are documented precisely.

Complete path:

- user keeps Xcode open with a workspace
- agent runs a small representative set of real commands
- docs and error copy adjusted only if behavior differs materially from the fake-bridge contract

Depends on:

- Slices 7 through 21

HITL reason:

- Requires a live local Xcode environment and, depending on machine state, may require human confirmation of Xcode permission prompts or workspace selection.

## Known Work Checklist

### Foundation

- [x] Replace template package identity, binary name, README references, and test references with `xcode-mcli`.
- [x] Replace template sample commands with the v1 command registry shape.
- [x] Extend command contracts to support shared global flags: `--json`, `--verbose`, `--tab-identifier`.
- [x] Define stable command-level option parsing helpers for repeatable flags and `key=value` inputs.

### Runtime Deep Modules

- [x] Implement environment/state-path helpers for app support paths and test overrides.
- [x] Implement bridge process spawning for `xcrun mcpbridge`.
- [x] Implement MCP message framing and request correlation.
- [x] Implement bridge initialize flow and tool discovery cache.
- [x] Implement tool call normalization for structured and text-only responses.
- [x] Implement daemon host lifecycle and socket server.
- [x] Implement daemon client request/response handling.
- [x] Implement daemon state persistence and stale socket/PID recovery.
- [x] Implement tab resolver against explicit flag, cached state, and windows list fallback.
- [x] Implement output/presentation helpers for text and JSON envelopes.
- [x] Implement confirmation guardrails for mutating commands.

### Command Surface

- [x] Implement `setup`.
- [x] Implement `daemon start`.
- [x] Implement `daemon status`.
- [x] Implement `daemon stop`.
- [x] Implement `daemon restart`.
- [x] Implement `windows list`.
- [x] Implement `windows use`.
- [x] Implement `project build`.
- [x] Implement `docs search`.
- [x] Implement `snippet execute`.
- [x] Implement `build log`.
- [x] Implement `tests list`.
- [x] Implement `preview render`.
- [x] Implement `tests run-all`.
- [x] Implement `tests run-some`.
- [x] Implement `files glob`.
- [x] Implement `files grep`.
- [x] Implement `files ls`.
- [x] Implement `issues list`.
- [x] Implement `files mv`.
- [x] Implement `files mkdir`.
- [x] Implement `files rm`.
- [x] Implement `files read`.
- [x] Implement `issues file`.
- [x] Implement `files update`.
- [x] Implement `files write`.

### Verification

- [x] Add CLI routing/help tests for the new command tree.
- [x] Add JSON envelope tests for success and failure.
- [x] Add daemon lifecycle tests using a fake bridge.
- [x] Add tab resolution tests covering explicit, cached, single-window, and multi-window behavior.
- [x] Add command contract tests for read-only commands.
- [x] Add command contract tests for project/test commands.
- [x] Add command contract tests for docs/preview/snippet commands.
- [x] Add command contract tests for issues commands.
- [x] Add guardrail tests for mutating commands.
- [x] Add output-shape fallback tests for text-only bridge responses.

### Documentation

- [x] Rewrite `README.md` for the actual CLI.
- [x] Create `docs/api-reference.md`.
- [x] Create `docs/setup.md`.
- [x] Create `docs/troubleshooting.md`.
- [x] Update existing research docs only where present behavior implementation changes documentation needs.

### Live Validation

- [x] Validate the daemon-backed repeated-call path against real Xcode.
- [x] Validate `windows list` against a real workspace.
- [x] Validate one read-only file command against a real workspace.
- [x] Validate one project or test command against a real workspace if feasible.
- [ ] Validate one mutating command only if it can be done safely in a disposable surface.

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 4
5. Slice 5
6. Slice 6
7. Slice 7
8. Slice 8
9. Slice 9
10. Slice 10
11. Slice 11
12. Slice 12
13. Slice 13
14. Slice 14
15. Slice 15
16. Slice 16
17. Slice 17
18. Slice 18
19. Slice 19
20. Slice 20
21. Slice 21
22. Slice 22

## Stop Conditions

Stop and ask the user if any of these happen:

- The spec conflicts with observed Xcode MCP behavior in a way that changes the public CLI contract.
- A slice appears to require a broader generic MCP abstraction than the spec allows.
- A live Xcode behavior requires destructive verification in a non-disposable project.
- A repo-wide refactor seems necessary to keep slices thin and the correct boundary is ambiguous.

## Resume Instructions

When resuming:

1. Read `AGENTS.md`, `~/.waypoint-flow.md`, and this long-task document.
2. Read `docs/oss-v1-spec.md`.
3. Check `git status -sb` and identify the next incomplete checklist item.
4. Resume at the earliest unfinished slice unless a later slice is already partially in progress.
5. Re-run the `Progress Check` before making new changes.

## Finished Work Means

This task is finished only when the `Done Gate` passes, the checklist is complete, and the resulting CLI can be used from the terminal as an Xcode MCP wrapper without requiring the user to register Xcode MCP inside Codex or another agent.
