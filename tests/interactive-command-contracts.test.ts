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
		name: "snippet execute forwards source path, timeout, and tab",
		args: [
			"snippet",
			"execute",
			"--tab-identifier",
			"windowtab1",
			"--source-file-path",
			"App/Main.swift",
			"--timeout",
			"12",
			"--code-snippet",
			"print(42)",
		],
		tool: "ExecuteSnippet",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			sourceFilePath: "App/Main.swift",
			timeout: 12,
			codeSnippet: "print(42)",
		},
	},
	{
		name: "preview render forwards preview index and timeout",
		args: [
			"preview",
			"render",
			"--tab-identifier",
			"windowtab1",
			"--source-file-path",
			"App/Preview.swift",
			"--timeout",
			"9",
			"--preview-definition-index-in-file",
			"3",
		],
		tool: "RenderPreview",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			sourceFilePath: "App/Preview.swift",
			timeout: 9,
			previewDefinitionIndexInFile: 3,
		},
	},
	{
		name: "tests run-some groups repeated test specifiers",
		args: [
			"tests",
			"run-some",
			"--tab-identifier",
			"windowtab1",
			"--test",
			"targetName=AppTests",
			"--test",
			"testIdentifier=AppTests/testExample()",
			"--test",
			"targetName=AppUITests",
			"--test",
			"testIdentifier=AppUITests/testLaunch()",
		],
		tool: "RunSomeTests",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			tests: [
				{
					targetName: "AppTests",
					testIdentifier: "AppTests/testExample()",
				},
				{
					targetName: "AppUITests",
					testIdentifier: "AppUITests/testLaunch()",
				},
			],
		},
	},
	{
		name: "issues file forwards file path and tab identifier",
		args: [
			"issues",
			"file",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
		],
		tool: "XcodeRefreshCodeIssuesInFile",
		expectedArguments: {
			tabIdentifier: "windowtab1",
			filePath: "App/Main.swift",
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
