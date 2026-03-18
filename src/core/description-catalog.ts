const commandGroupDescriptions = {
	build: "Inspect the current or most recently finished Xcode build log.",
	daemon: "Manage the persistent Xcode MCP bridge daemon.",
	docs: "Search Apple Developer Documentation using semantic matching.",
	files: "Read, search, and modify files in the Xcode project structure.",
	issues: "Inspect workspace issues and file-specific compiler diagnostics.",
	preview: "Build and render SwiftUI previews from source files.",
	project: "Build the active Xcode project and wait for completion.",
	snippet: "Build and run Swift snippets in the context of a source file.",
	surface: "Capture and verify the live Xcode MCP tool surface.",
	tests: "List tests and run the active scheme's active test plan.",
	windows: "List Xcode windows and select the active workspace tab.",
} as const;

const toolDescriptions = {
	BuildProject: "Builds an Xcode project and waits until the build completes.",
	DocumentationSearch: "Searches Apple Developer Documentation using semantic matching.",
	ExecuteSnippet:
		"Builds and runs a snippet of code in the context of a specific file and waits until results are available.",
	GetBuildLog: "Gets the log of the current or most recently finished build.",
	GetTestList: "Gets all available tests from the active scheme's active test plan.",
	RenderPreview:
		"Builds and renders a Preview and waits until a snapshot of the resulting UI is available.",
	RunAllTests: "Runs all tests from the active scheme's active test plan.",
	RunSomeTests: "Runs specific tests using the active scheme's active test plan.",
	XcodeGlob: "Finds files in the Xcode project structure matching wildcard patterns.",
	XcodeGrep: "Searches for text patterns in files within the Xcode project structure using regex.",
	XcodeListNavigatorIssues:
		"Lists the currently known issues shown in Xcode's Issue Navigator for the workspace.",
	XcodeListWindows: "Lists the current Xcode windows and their workspace information.",
	XcodeLS: "Lists files and directories in the Xcode project structure at the specified path.",
	XcodeMakeDir: "Creates directories and groups in the Xcode project structure.",
	XcodeMV:
		"Moves or renames files and directories in the project navigator with support for filesystem operations.",
	XcodeRead:
		"Reads the contents of a file within the Xcode project organization with line numbers.",
	XcodeRefreshCodeIssuesInFile:
		"Retrieves current compiler diagnostics for a file in the Xcode project.",
	XcodeRM:
		"Removes files and directories from the Xcode project structure and optionally deletes the underlying files.",
	XcodeUpdate: "Edits files in the Xcode project by replacing text content.",
	XcodeWrite: "Creates or overwrites files with content in the Xcode project.",
} as const;

export const cliDescription = "Use Xcode from the terminal through Apple's Xcode MCP bridge.";

function readCatalogValue<TCatalog extends Record<string, string>>(
	catalog: TCatalog,
	key: string,
): string | undefined {
	if (Object.hasOwn(catalog, key)) {
		return catalog[key];
	}
	return undefined;
}

export function describeCommandGroup(groupName: string): string {
	return readCatalogValue(commandGroupDescriptions, groupName)
		?? `${groupName} commands.`;
}

export function describeToolCommand(
	toolName: string | undefined,
	fallbackDescription: string,
): string {
	if (!toolName) {
		return fallbackDescription;
	}
	return readCatalogValue(toolDescriptions, toolName) ?? fallbackDescription;
}
