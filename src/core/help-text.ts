import type { CommandPath } from "./contracts.ts";

type HelpSection = {
	lines: readonly string[];
	title: string;
};

function formatSection(section: HelpSection): string {
	const content = section.lines.map((line) => line.length > 0 ? `  ${line}` : "").join("\n");
	return `${section.title}:\n${content}`;
}

function toAfterHelpBlock(sections: readonly HelpSection[]): string {
	return `\n${sections.map(formatSection).join("\n\n")}`;
}

function commandPathKey(path: CommandPath): string {
	return path.join(" ");
}

const programHelpText = toAfterHelpBlock([
	{
		title: "Agent Workflow",
		lines: [
			"1. Run `xcode-mcli setup`.",
			"2. If the first live Xcode command triggers a macOS approval dialog, wait for the user to click `Allow`.",
			"3. Run `xcode-mcli windows list`.",
			"4. Run `xcode-mcli windows use --tab-identifier windowtab1` when multiple Xcode workspace windows are open or when you want a stable cached tab.",
			"5. Run the command you need and prefer `--json` when another agent or script will parse the result.",
		],
	},
	{
		title: "Operating Rules",
		lines: [
			"The daemon auto-starts on the first daemon-backed command.",
			"Many tab-aware commands resolve the tab automatically when one Xcode workspace window is open or after `windows use`.",
			"Pass `--tab-identifier <id>` explicitly when multiple Xcode workspace windows are open.",
			"Use `--verbose` to print the exact Xcode MCP tool name to stderr.",
			"`files update`, `files write`, `files rm`, and `files mv --overwrite-existing` are destructive and require `--yes`.",
			"`tests` commands use the active Xcode destination from the selected window.",
			"`surface` commands are for compatibility verification, not everyday project work.",
		],
	},
	{
		title: "Common Tasks",
		lines: [
			"`xcode-mcli files read --file-path App/Main.swift`",
			"`xcode-mcli files grep --pattern TODO --glob '**/*.swift' --show-line-numbers`",
			"`xcode-mcli project build`",
			"`xcode-mcli issues list --severity error`",
			"`xcode-mcli tests list`",
			"`xcode-mcli tests run-some --test targetName=AppTests --test testIdentifier=AppTests/MyFeatureTests/testHappyPath`",
		],
	},
]);

const groupHelpTexts: Record<string, string> = {
	build: toAfterHelpBlock([
		{
			title: "Task",
			lines: [
				"Use `xcode-mcli project build` to run a build.",
				"Use `xcode-mcli build log` to inspect the current or latest build output.",
			],
		},
		{
			title: "Severity Values",
			lines: ["`error`, `warning`, `remark`."],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli build log --severity error --pattern SwiftUI`"],
		},
	]),
	daemon: toAfterHelpBlock([
		{
			title: "Tip",
			lines: [
				"The daemon auto-starts on the first daemon-backed command.",
				"Use these commands only when you want explicit lifecycle control or when you are debugging bridge issues.",
			],
		},
	]),
	docs: toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli docs search --query SwiftUI animation --framework SwiftUI --json`"],
		},
	]),
	files: toAfterHelpBlock([
		{
			title: "Workflow",
			lines: [
				"Use `read`, `grep`, `glob`, and `ls` for safe inspection.",
				"Use `update`, `write`, `rm`, and `mv --overwrite-existing` only with `--yes`.",
				"File commands target the active Xcode tab and can resolve it automatically when one workspace window is open or after `windows use`.",
			],
		},
		{
			title: "Examples",
			lines: [
				"`xcode-mcli files read --file-path App/Main.swift`",
				"`xcode-mcli files grep --pattern TODO --glob '**/*.swift' --show-line-numbers`",
			],
		},
	]),
	issues: toAfterHelpBlock([
		{
			title: "Severity Values",
			lines: ["`error`, `warning`, `remark`."],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli issues list --severity warning`"],
		},
	]),
	preview: toAfterHelpBlock([
		{
			title: "Example",
			lines: [
				"`xcode-mcli preview render --source-file-path App/ContentView.swift --preview-definition-index-in-file 0`",
			],
		},
		{
			title: "Tip",
			lines: [
				"Pass `--preview-definition-index-in-file` when a file contains more than one preview.",
			],
		},
	]),
	project: toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli project build --tab-identifier windowtab1`"],
		},
		{
			title: "Tip",
			lines: [
				"Omit `--tab-identifier` after `windows use` or when exactly one Xcode workspace window is open.",
			],
		},
	]),
	snippet: toAfterHelpBlock([
		{
			title: "Example",
			lines: [
				"`xcode-mcli snippet execute --source-file-path App/ContentView.swift --code-snippet 'print(\"hello\")'`",
			],
		},
	]),
	surface: toAfterHelpBlock([
		{
			title: "Workflow",
			lines: [
				"Use `snapshot` to capture the live Xcode MCP tool surface.",
				"Use `verify` to compare the live surface against a pinned baseline.",
				"This group is for compatibility and release maintenance, not everyday project work.",
			],
		},
	]),
	tests: toAfterHelpBlock([
		{
			title: "Workflow",
			lines: [
				"Start with `xcode-mcli tests list` to inspect the active test plan.",
				"Use `xcode-mcli tests run-all` to run everything or `xcode-mcli tests run-some` to target specific tests.",
				"Tests use the active Xcode destination from the selected window.",
			],
		},
	]),
	windows: toAfterHelpBlock([
		{
			title: "Workflow",
			lines: [
				"Run `xcode-mcli windows list` to see open workspaces and tab identifiers.",
				"Run `xcode-mcli windows use --tab-identifier windowtab1` when multiple workspace windows are open or when you want a stable cached tab.",
			],
		},
	]),
};

const commandHelpTexts: Record<string, string> = {
	"build log": toAfterHelpBlock([
		{
			title: "Severity Values",
			lines: ["`error`, `warning`, `remark`."],
		},
		{
			title: "Examples",
			lines: [
				"`xcode-mcli build log`",
				"`xcode-mcli build log --severity error --pattern SwiftUI`",
			],
		},
	]),
	"daemon status": toAfterHelpBlock([
		{
			title: "Use",
			lines: [
				"Run this command when you need to confirm the daemon is alive or inspect bridge state after a failed Xcode call.",
			],
		},
	]),
	"docs search": toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli docs search --query SwiftUI animation --framework SwiftUI --json`"],
		},
	]),
	"files grep": toAfterHelpBlock([
		{
			title: "Output Modes",
			lines: [
				"`content` prints matching lines.",
				"`files_with_matches` prints matching file paths.",
				"`count` prints the number of matches.",
			],
		},
		{
			title: "Example",
			lines: [
				"`xcode-mcli files grep --pattern NavigationStack --glob '**/*.swift' --show-line-numbers`",
			],
		},
	]),
	"files mv": toAfterHelpBlock([
		{
			title: "Safety",
			lines: ["Pass `--yes` only when using `--overwrite-existing`."],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli files mv --source-path App/Old.swift --destination-path App/New.swift`"],
		},
	]),
	"files read": toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli files read --file-path App/Main.swift`"],
		},
		{
			title: "Tip",
			lines: [
				"Output includes line numbers. Omit `--tab-identifier` after `windows use` or when one Xcode workspace window is open.",
			],
		},
	]),
	"files rm": toAfterHelpBlock([
		{
			title: "Safety",
			lines: [
				"This command changes project structure and requires `--yes`.",
				"`--delete-files` also removes the underlying filesystem entries.",
			],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli files rm --path App/Old.swift --yes`"],
		},
	]),
	"files update": toAfterHelpBlock([
		{
			title: "Safety",
			lines: ["This command changes project files and requires `--yes`."],
		},
		{
			title: "Example",
			lines: [
				"`xcode-mcli files update --file-path App/Main.swift --old-string Foo --new-string Bar --yes`",
			],
		},
	]),
	"files write": toAfterHelpBlock([
		{
			title: "Safety",
			lines: ["This command creates or overwrites project files and requires `--yes`."],
		},
		{
			title: "Examples",
			lines: [
				"`xcode-mcli files write --file-path App/New.swift --content 'struct NewView {}' --yes`",
				"`xcode-mcli files write --file-path App/New.swift --content-file ./snippet.swift --yes`",
			],
		},
	]),
	"issues file": toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli issues file --file-path App/ContentView.swift`"],
		},
		{
			title: "Tip",
			lines: ["Use `xcode-mcli issues list` when you need workspace-wide diagnostics."],
		},
	]),
	"issues list": toAfterHelpBlock([
		{
			title: "Severity Values",
			lines: ["`error`, `warning`, `remark`."],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli issues list --severity warning`"],
		},
	]),
	"preview render": toAfterHelpBlock([
		{
			title: "Example",
			lines: [
				"`xcode-mcli preview render --source-file-path App/ContentView.swift --preview-definition-index-in-file 0`",
			],
		},
		{
			title: "Tip",
			lines: [
				"Pass `--preview-definition-index-in-file` when a file contains more than one preview.",
			],
		},
	]),
	"project build": toAfterHelpBlock([
		{
			title: "Example",
			lines: ["`xcode-mcli project build --tab-identifier windowtab1`"],
		},
		{
			title: "Tip",
			lines: [
				"Omit `--tab-identifier` after `windows use` or when exactly one Xcode workspace window is open.",
			],
		},
	]),
	setup: toAfterHelpBlock([
		{
			title: "Purpose",
			lines: ["Verifies `xcrun mcpbridge` access and initializes the local xcode-mcli state root."],
		},
		{
			title: "Approval",
			lines: [
				"The first live Xcode command after setup may pause for a macOS approval dialog.",
				"Wait for the user to click `Allow` before treating the command as stalled.",
			],
		},
		{
			title: "Next",
			lines: [
				"`xcode-mcli windows list`",
				"`xcode-mcli windows use --tab-identifier windowtab1`",
			],
		},
	]),
	"snippet execute": toAfterHelpBlock([
		{
			title: "Example",
			lines: [
				"`xcode-mcli snippet execute --source-file-path App/ContentView.swift --code-snippet 'print(\"hello\")'`",
			],
		},
	]),
	"tests run-some": toAfterHelpBlock([
		{
			title: "Format",
			lines: [
				"Repeat `--test` for each field in each selected test.",
				"One test requires both `targetName=<target>` and `testIdentifier=<identifier>`.",
			],
		},
		{
			title: "Examples",
			lines: [
				"`xcode-mcli tests run-some --test targetName=AppTests --test testIdentifier=AppTests/MyFeatureTests/testHappyPath`",
				"`xcode-mcli tests run-some --test targetName=AppTests --test testIdentifier=AppTests/MyFeatureTests/testHappyPath --test targetName=AppTests --test testIdentifier=AppTests/MyOtherTests/testSadPath`",
			],
		},
		{
			title: "Tip",
			lines: ["Run `xcode-mcli tests list` first to copy exact target names and test identifiers."],
		},
	]),
	"windows use": toAfterHelpBlock([
		{
			title: "Use",
			lines: ["Run `xcode-mcli windows list` first to find a tab identifier."],
		},
		{
			title: "Example",
			lines: ["`xcode-mcli windows use --tab-identifier windowtab1`"],
		},
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
