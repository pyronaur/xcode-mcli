import { expect, test } from "vitest";

import { runCommandWithFakeBridge } from "./helpers/fake-command-run.ts";

const okTextResult = {
	content: [
		{
			type: "text",
			text: "ok\n",
		},
	],
};

test.each([
	{
		name: "docs search maps query and repeated frameworks",
		args: [
			"docs",
			"search",
			"--query",
			"SwiftUI",
			"--framework",
			"SwiftUI",
			"--framework",
			"Foundation",
		],
		tool: "DocumentationSearch",
		expectedArguments: {
			query: "SwiftUI",
			frameworks: ["SwiftUI", "Foundation"],
		},
	},
	{
		name: "docs search accepts tab selection without forwarding it",
		args: [
			"docs",
			"search",
			"--query",
			"SwiftUI",
			"--tab-identifier",
			"windowtab1",
		],
		tool: "DocumentationSearch",
		expectedArguments: {
			query: "SwiftUI",
			frameworks: [],
		},
	},
	{
		name: "build log forwards filters and tab identifier",
		args: [
			"build",
			"log",
			"--tab-identifier",
			"windowtab1",
			"--glob",
			"*.log",
			"--pattern",
			"error",
			"--severity",
			"warning",
		],
		tool: "GetBuildLog",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			glob: "*.log",
			pattern: "error",
			severity: "warning",
		},
	},
	{
		name: "tests list forwards the active tab",
		args: ["tests", "list", "--tab-identifier", "windowtab1"],
		tool: "GetTestList",
		expectedArguments: {
			tabIdentifier: "windowtab1",
		},
	},
	{
		name: "tests run-all forwards the active tab",
		args: ["tests", "run-all", "--tab-identifier", "windowtab1"],
		tool: "RunAllTests",
		expectedArguments: {
			tabIdentifier: "windowtab1",
		},
	},
	{
		name: "files glob forwards path and pattern",
		args: [
			"files",
			"glob",
			"--tab-identifier",
			"windowtab1",
			"--path",
			"App",
			"--pattern",
			"**/*.swift",
		],
		tool: "XcodeGlob",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			path: "App",
			pattern: "**/*.swift",
		},
	},
	{
		name: "files grep forwards search modifiers",
		args: [
			"files",
			"grep",
			"--tab-identifier",
			"windowtab1",
			"--pattern",
			"NavigationStack",
			"--glob",
			"**/*.swift",
			"--ignore-case",
			"--head-limit",
			"5",
			"--lines-context",
			"2",
			"--output-mode",
			"count",
			"--show-line-numbers",
		],
		tool: "XcodeGrep",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			pattern: "NavigationStack",
			glob: "**/*.swift",
			ignoreCase: true,
			headLimit: 5,
			linesContext: 2,
			outputMode: "count",
			showLineNumbers: true,
			multiline: false,
		},
	},
	{
		name: "files ls forwards recursive and ignore patterns",
		args: [
			"files",
			"ls",
			"--tab-identifier",
			"windowtab1",
			"--path",
			"App",
			"--recursive",
			"--ignore",
			"**/*.generated.swift",
		],
		tool: "XcodeLS",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			path: "App",
			recursive: true,
			ignore: ["**/*.generated.swift"],
		},
	},
	{
		name: "issues list forwards filters and tab identifier",
		args: [
			"issues",
			"list",
			"--tab-identifier",
			"windowtab1",
			"--glob",
			"**/*.swift",
			"--pattern",
			"warning",
			"--severity",
			"remark",
		],
		tool: "XcodeListNavigatorIssues",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			glob: "**/*.swift",
			pattern: "warning",
			severity: "remark",
		},
	},
	{
		name: "files read forwards offset and limit",
		args: [
			"files",
			"read",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
			"--offset",
			"10",
			"--limit",
			"20",
		],
		tool: "XcodeRead",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			filePath: "App/Main.swift",
			offset: 10,
			limit: 20,
		},
	},
])("$name", async ({ args, expectedArguments, tool }) => {
	const result = await runCommandWithFakeBridge({
		args,
		tools: [
			{
				name: tool,
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			[tool]: okTextResult,
		},
	});
	expect(result.lines).toEqual(["ok"]);
	expect(result.calls).toEqual([
		{
			name: tool,
			arguments: expectedArguments,
		},
	]);
});
