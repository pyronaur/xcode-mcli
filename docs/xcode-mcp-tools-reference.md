# Xcode MCP Tools Reference

This is the exhaustive current-session reference for the built-in `xcode` MCP server surface available in this environment.

Important scope note:

- This documents the tool signatures exposed in the current session.
- The session exposes input schemas and parameter descriptions.
- Output schemas are not broadly exposed in this environment, so output notes are limited to what is directly documented or inferable from tool descriptions.

## Shared Conventions

### `tabIdentifier`

Many tools require `tabIdentifier`.

Meaning:

- the workspace tab identifier inside Xcode

Implication:

- a wrapper should discover this first, usually through `XcodeListWindows`

### Xcode Project Navigator Paths

Several tools explicitly use Xcode project organization paths rather than raw filesystem paths.

Typical examples from the tool descriptions:

- `ProjectName/Sources/MyFile.swift`
- `ProjectName/Sources/`

Wrapper implication:

- do not silently reinterpret these as absolute filesystem paths

### Globs and Regex

Search tools expose both:

- file-selection globs
- content regex patterns

Wrapper implication:

- keep those controls separate in the CLI and docs

### Preview Indices

Preview indices are zero-based.

### Test Specifiers

`RunSomeTests` requires test specifiers built from:

- `targetName`
- XCTest-style `testIdentifier`

The intended discovery flow is:

1. use `GetTestList`
2. read target and identifier values
3. feed those into `RunSomeTests`

## Tool Reference

## `BuildProject`

Purpose:

- build an Xcode project and wait for completion

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |

Notes:

- This is workspace-tab scoped.
- A wrapper should refuse to call this before tab resolution.

## `DocumentationSearch`

Purpose:

- search Apple Developer Documentation using semantic matching

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `query` | string | yes | Search query text. |
| `frameworks` | string[] | no | Restrict search to one or more frameworks. If omitted, searches all frameworks. |

Notes:

- This is not the same as a web search wrapper.
- The tool is already Apple-documentation aware, so it should be a first-class wrapper subcommand.

## `ExecuteSnippet`

Purpose:

- build and run a code snippet in the context of a specific Swift source file and wait for output

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `codeSnippet` | string | yes | Swift code snippet to execute. |
| `sourceFilePath` | string | yes | Swift source file path within Xcode project organization. The snippet gets access to this file context, including `fileprivate` declarations. |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `timeout` | number | no | Wait timeout in seconds. Default is `120`. |

Notes:

- This is one of the highest-value tools for a wrapper.
- It is source-context aware, not just raw code execution.
- It is specific to source files in targets that build apps, frameworks, libraries, or command-line executables.

## `GetBuildLog`

Purpose:

- retrieve the current or most recently finished build log

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `glob` | string | no | Filters returned build log entries by file glob. Matches issue `path` and build task location. |
| `pattern` | string | no | Filters returned build log entries by message regex. Matches issue text, task description, command line, and console output. |
| `severity` | string | no | Minimum issue severity. Valid values: `error`, `warning`, `remark`. Default is `error`. |

Notes:

- Useful after `BuildProject`.
- The tool description says the response also indicates whether the build is currently in progress.

## `GetTestList`

Purpose:

- list all available tests from the active scheme's active test plan

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |

Notes:

- This is the discovery primitive for targeted test execution.

## `RenderPreview`

Purpose:

- build and render a SwiftUI preview and wait for a snapshot

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `sourceFilePath` | string | yes | File path within Xcode project organization. |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `previewDefinitionIndexInFile` | number | no | Zero-based index of the `#Preview` macro or `PreviewProvider` definition. Default is `0`. |
| `timeout` | number | no | Timeout in seconds. Default is `120`. |

Notes:

- Preview selection is by index, not by symbol name.
- A wrapper can improve ergonomics by offering preview enumeration or symbolic aliases later.

## `RunAllTests`

Purpose:

- run all tests from the active scheme's active test plan

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |

Notes:

- Simplest full-suite test command.

## `RunSomeTests`

Purpose:

- run selected tests from the active scheme's active test plan

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `tests` | array of objects | yes | Array of test specifiers. |

`tests[]` item properties:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `targetName` | string | yes | Test target name. |
| `testIdentifier` | string | yes | XCTest identifier format. Discover with `GetTestList`. |

Notes:

- This should map cleanly to wrapper commands like `test one` or `test some`.
- The wrapper should never make users handcraft identifiers if it can query `GetTestList` first.

## `XcodeGlob`

Purpose:

- find files in the Xcode project structure matching wildcard patterns

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `path` | string | no | Project directory to search in. Defaults to project root. |
| `pattern` | string | no | Wildcard file pattern. Defaults to `**/*` if omitted. Supports forms like `*.swift`, `**/*.json`, `src/**/*.{swift,m}`. |

Notes:

- Operates on Xcode project organization, not filesystem layout.
- This is a discovery helper, not content search.

## `XcodeGrep`

Purpose:

- search for text patterns in files within the Xcode project structure using regex

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `pattern` | string | yes | Regex pattern. This argument is mandatory and the tool fails without it. |
| `glob` | string | no | Restrict search to files matching the glob. |
| `headLimit` | number | no | Stop after N results. |
| `ignoreCase` | boolean | no | Case-insensitive search when true. |
| `linesAfter` | number | no | Show N lines after each match. |
| `linesBefore` | number | no | Show N lines before each match. |
| `linesContext` | number | no | Show N lines before and after each match. |
| `multiline` | boolean | no | Allow patterns to span multiple lines. |
| `outputMode` | string | no | Output mode: `content`, `files_with_matches`, or `count`. Default is `files_with_matches`. |
| `path` | string | no | Search root within project. Defaults to root. |
| `showLineNumbers` | boolean | no | Show line numbers in content mode only. |
| `type` | string | no | Shortcut for common file types such as `swift`, `js`, `py`. |

Notes:

- The tool definition explicitly warns that `pattern` is required.
- A good wrapper should expose `grep count`, `grep files`, and `grep content` as friendly presets.

## `XcodeLS`

Purpose:

- list files and directories in the Xcode project structure

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `path` | string | yes | Project path to browse, for example `ProjectName/Sources/`. |
| `ignore` | string[] | no | Skip files or folders matching these patterns. |
| `recursive` | boolean | no | Recursively list all files. Default is `true`. Output is truncated to 100 lines. |

Notes:

- This is the Xcode-project equivalent of `ls`.

## `XcodeListNavigatorIssues`

Purpose:

- list issues currently shown in Xcode's Issue Navigator UI

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `glob` | string | no | Filter by issue path glob. |
| `pattern` | string | no | Filter by issue message regex. |
| `severity` | string | no | Minimum severity: `error`, `warning`, `remark`. Default is `error`. |

Notes:

- This is issue-navigator state, not just compiler stderr.
- Useful for "what is broken in the workspace right now?" wrapper commands.

## `XcodeListWindows`

Purpose:

- list currently known Xcode windows and their workspace information

Parameters:

- no parameters

Notes:

- This is the preflight tool for almost every serious wrapper operation.
- During this research pass it returned `No workspace windows found`.

## `XcodeMV`

Purpose:

- move or rename files and directories in the Xcode project navigator, with filesystem support

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `sourcePath` | string | yes | Project navigator relative source path. |
| `destinationPath` | string | yes | Destination project navigator path for move or new name for rename. |
| `operation` | string | no | Type of move operation. |
| `overwriteExisting` | boolean | no | Whether to overwrite existing files at destination. |

Notes:

- This is mutating.
- A wrapper should likely require confirmation or an explicit destructive mode when overwriting.

## `XcodeMakeDir`

Purpose:

- create directories and groups in the Xcode project structure

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `directoryPath` | string | yes | Project navigator relative path for the directory to create. |

Notes:

- This is mutating but usually low-risk.

## `XcodeRM`

Purpose:

- remove files and directories from the Xcode project structure and optionally delete underlying files

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `path` | string | yes | Project path to remove, for example `ProjectName/Sources/MyFile.swift`. |
| `deleteFiles` | boolean | no | Whether to also move underlying files to Trash. Default is `true`. |
| `recursive` | boolean | no | Remove directories and contents recursively. |

Notes:

- This is one of the highest-risk tools in the catalog.
- The default `deleteFiles: true` matters. A wrapper should surface that loudly.
- If you want project-only removal without trashing files, the wrapper should offer an explicit safe mode.

## `XcodeRead`

Purpose:

- read file contents from the Xcode project organization

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `filePath` | string | yes | File path within Xcode project organization. |
| `limit` | number | no | Number of lines to read when the file is large. The tool description says it supports reading up to 600 lines by default. |
| `offset` | number | no | Line number to start reading from when paginating large files. |

Notes:

- Returns content in `cat -n` style with line numbers according to the tool description.
- Wrapper ergonomics should probably include `read`, `read head`, and `read from` aliases.

## `XcodeRefreshCodeIssuesInFile`

Purpose:

- retrieve current compiler diagnostics for a file

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `filePath` | string | yes | File path within Xcode project organization. |

Notes:

- This is more targeted than `XcodeListNavigatorIssues`.
- Good wrapper command for "what is wrong with this specific file?"

## `XcodeUpdate`

Purpose:

- edit files in the Xcode project by replacing text content

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `filePath` | string | yes | Path to the file to modify in Xcode project organization. |
| `oldString` | string | yes | Text to replace. |
| `newString` | string | yes | Replacement text. Must be different from `oldString`. |
| `replaceAll` | boolean | no | Replace all occurrences. Default is `false`. |

Notes:

- The tool definition explicitly says it fails if `filePath`, `oldString`, or `newString` are missing.
- This is a literal string replacement tool, not an AST tool.
- Wrapper design should include a dry-run or preview mode if possible.

## `XcodeWrite`

Purpose:

- create or overwrite files with content in the Xcode project

Parameters:

| Property | Type | Required | Details |
| --- | --- | --- | --- |
| `tabIdentifier` | string | yes | Workspace tab identifier. |
| `filePath` | string | yes | File path within Xcode project organization. |
| `content` | string | yes | Full file contents to write. |

Notes:

- Automatically adds new files to the project structure according to the tool description.
- This is a strong primitive for generation flows.
- Because this can overwrite, wrapper UX should separate `write new` from `overwrite`.

## Wrapper-Oriented Summary

If you are implementing a friendly CLI on top of these tools, the highest-value first-class commands are probably:

1. `windows`
2. `ls`
3. `grep`
4. `read`
5. `build`
6. `build-log`
7. `tests list`
8. `tests run`
9. `preview`
10. `snippet`
11. `issues`
12. `write`
13. `replace`
14. `move`
15. `remove`

The highest-risk tools are:

1. `XcodeRM`
2. `XcodeWrite`
3. `XcodeUpdate`
4. `XcodeMV`

Those should get the strongest wrapper guardrails.
