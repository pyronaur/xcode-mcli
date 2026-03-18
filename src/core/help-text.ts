import type { CommandPath } from "./contracts.ts";

function toAfterHelpBlock(lines: readonly string[]): string {
	return `\n${lines.join("\n")}`;
}

function commandPathKey(path: CommandPath): string {
	return path.join(" ");
}

const programHelpText = toAfterHelpBlock([
	"Quick Start:",
	"  xcode-mcli setup",
	"  xcode-mcli windows list",
	"  xcode-mcli windows use --tab-identifier windowtab1",
	"  xcode-mcli files read --file-path Path/To/File.swift",
	"",
	"Notes:",
	"  The daemon auto-starts on the first daemon-backed command.",
	"  Many tab-aware commands can resolve the tab automatically when one Xcode workspace window is open or after `windows use`.",
	"  Run `xcode-mcli windows list` to see valid tab identifiers.",
]);

const groupHelpTexts: Record<string, string> = {
	build: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli build log --severity error",
	]),
	daemon: toAfterHelpBlock([
		"Tip:",
		"  The daemon auto-starts on the first daemon-backed command.",
		"  Use these commands when you want explicit lifecycle control.",
	]),
	docs: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli docs search --query SwiftUI animation",
	]),
	files: toAfterHelpBlock([
		"Examples:",
		"  xcode-mcli files read --file-path App/Main.swift",
		"  xcode-mcli files grep --pattern TODO",
		"",
		"Tip:",
		"  File commands target the active Xcode tab and can resolve it automatically when one workspace window is open or after `windows use`.",
	]),
	issues: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli issues list --severity warning",
	]),
	preview: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli preview render --source-file-path App/ContentView.swift",
	]),
	project: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli project build --tab-identifier windowtab1",
		"",
		"Tip:",
		"  Omit `--tab-identifier` after `windows use` or when exactly one Xcode workspace window is open.",
	]),
	snippet: toAfterHelpBlock([
		"Example:",
		"  xcode-mcli snippet execute --source-file-path App/ContentView.swift --code-snippet 'print(\"hello\")'",
	]),
	tests: toAfterHelpBlock([
		"Workflow:",
		"  Start with `xcode-mcli tests list` to inspect the active test plan.",
		"  Use `xcode-mcli tests run-all` to run everything or `xcode-mcli tests run-some` to target specific tests.",
	]),
	windows: toAfterHelpBlock([
		"Workflow:",
		"  Run `xcode-mcli windows list` to see open workspaces and tab identifiers.",
		"  Run `xcode-mcli windows use --tab-identifier windowtab1` to cache the active tab for later commands.",
	]),
};

const commandHelpTexts: Record<string, string> = {
	"build log": toAfterHelpBlock([
		"Examples:",
		"  xcode-mcli build log",
		"  xcode-mcli build log --severity error --pattern SwiftUI",
	]),
	"docs search": toAfterHelpBlock([
		"Example:",
		"  xcode-mcli docs search --query SwiftUI animation --framework SwiftUI",
	]),
	"files read": toAfterHelpBlock([
		"Example:",
		"  xcode-mcli files read --file-path App/Main.swift",
		"",
		"Tip:",
		"  Output includes line numbers. Omit `--tab-identifier` after `windows use` or when one Xcode workspace window is open.",
	]),
	"preview render": toAfterHelpBlock([
		"Example:",
		"  xcode-mcli preview render --source-file-path App/ContentView.swift --preview-definition-index-in-file 0",
	]),
	"project build": toAfterHelpBlock([
		"Example:",
		"  xcode-mcli project build --tab-identifier windowtab1",
		"",
		"Tip:",
		"  Omit `--tab-identifier` after `windows use` or when exactly one Xcode workspace window is open.",
	]),
	setup: toAfterHelpBlock([
		"Purpose:",
		"  Verifies `xcrun mcpbridge` access and initializes the local xcode-mcli state root.",
		"",
		"Next:",
		"  xcode-mcli windows list",
		"  xcode-mcli windows use --tab-identifier windowtab1",
	]),
	"snippet execute": toAfterHelpBlock([
		"Example:",
		"  xcode-mcli snippet execute --source-file-path App/ContentView.swift --code-snippet 'print(\"hello\")'",
	]),
	"tests run-some": toAfterHelpBlock([
		"Required `--test` fields for each selected test:",
		"  targetName=<target>",
		"  testIdentifier=<identifier>",
		"",
		"Example:",
		"  xcode-mcli tests run-some --test targetName=AppTests --test testIdentifier=AppTests/MyFeatureTests/testHappyPath",
	]),
	"windows use": toAfterHelpBlock([
		"Use `xcode-mcli windows list` to find a tab identifier first.",
		"",
		"Example:",
		"  xcode-mcli windows use --tab-identifier windowtab1",
	]),
};

export const tabIdentifierOptionDescription =
	"Active Xcode tab identifier. Use `windows list` to find one.";

export function readProgramHelpText(): string {
	return programHelpText;
}

export function readCommandGroupHelpText(groupName: string): string | undefined {
	if (Object.hasOwn(groupHelpTexts, groupName)) {
		return groupHelpTexts[groupName];
	}
	return undefined;
}

export function readCommandHelpText(path: CommandPath): string | undefined {
	const key = commandPathKey(path);
	if (Object.hasOwn(commandHelpTexts, key)) {
		return commandHelpTexts[key];
	}
	return undefined;
}
