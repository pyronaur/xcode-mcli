import type { Command } from "commander";
import { z } from "zod";

import {
	addTabIdentifierOption,
	collectRepeatedStrings,
	createToolCommand,
	parseKeyValuePairs,
	requireYes,
	resolveWriteContent,
} from "./tool-command.ts";

const severitySchema = z.enum(["error", "warning", "remark"]);
const outputModeSchema = z.enum(["content", "files_with_matches", "count"]);
const optionalTabIdentifierShape = {
	tabIdentifier: z.string().trim().min(1).optional(),
};
const yesAndOptionalTabShape = {
	yes: z.boolean().default(false),
	...optionalTabIdentifierShape,
};
const sourceFileTimeoutShape = {
	sourceFilePath: z.string().trim().min(1),
	timeout: z.coerce.number().positive().optional(),
	...optionalTabIdentifierShape,
};
const tabOnlyCommandSpecs = [
	{
		description: "List tests from the active test plan.",
		path: ["tests", "list"] as const,
		toolName: "GetTestList",
	},
	{
		description: "Run all tests from the active test plan.",
		path: ["tests", "run-all"] as const,
		toolName: "RunAllTests",
	},
];
const filteredCommandSpecs = [
	{
		description: "Read the current or latest build log.",
		path: ["build", "log"] as const,
		toolName: "GetBuildLog",
	},
	{
		description: "List navigator issues.",
		path: ["issues", "list"] as const,
		toolName: "XcodeListNavigatorIssues",
	},
];

function createTabOnlyCommand(input: (typeof tabOnlyCommandSpecs)[number]) {
	return createToolCommand({
		path: input.path,
		description: input.description,
		toolName: input.toolName,
		requiresTab: true,
		optionsSchema: z.object(optionalTabIdentifierShape),
		configure: addTabIdentifierOption,
		buildArguments: (options) => options,
	});
}

function createFilteredCommand(input: (typeof filteredCommandSpecs)[number]) {
	return createToolCommand({
		path: input.path,
		description: input.description,
		toolName: input.toolName,
		requiresTab: true,
		optionsSchema: z.object({
			glob: z.string().trim().min(1).optional(),
			pattern: z.string().trim().min(1).optional(),
			severity: severitySchema.optional(),
			...optionalTabIdentifierShape,
		}),
		configure: (command) => {
			command.option("--glob <glob>", "Filter results by glob.");
			command.option("--pattern <regex>", "Filter results by regex.");
			command.option("--severity <level>", "Minimum issue severity.");
			addTabIdentifierOption(command);
		},
		buildArguments: (options) => options,
	});
}

function configureSourceFileTimeoutCommand(command: Command, input: {
	includePreviewDefinitionIndex?: boolean;
	sourceHelp: string;
}): void {
	command.requiredOption("--source-file-path <path>", input.sourceHelp);
	if (input.includePreviewDefinitionIndex) {
		command.option(
			"--preview-definition-index-in-file <n>",
			"Zero-based preview definition index.",
		);
	}
	command.option("--timeout <seconds>", "Execution timeout in seconds.");
	addTabIdentifierOption(command);
}

const docsSearchCommand = createToolCommand({
	path: ["docs", "search"],
	description: "Search Apple documentation through Xcode MCP.",
	toolName: "DocumentationSearch",
	optionsSchema: z.object({
		query: z.string().trim().min(1),
		framework: z.array(z.string()).default([]),
	}),
	configure: (command) => {
		command.requiredOption("--query <text>", "Search query text.");
		command.option(
			"--framework <name>",
			"Restrict search to a framework.",
			collectRepeatedStrings,
			[],
		);
	},
	buildArguments: (options) => ({
		query: options.query,
		frameworks: options.framework,
	}),
});

const snippetExecuteCommand = createToolCommand({
	path: ["snippet", "execute"],
	description: "Execute a Swift snippet in Xcode source context.",
	toolName: "ExecuteSnippet",
	requiresTab: true,
	optionsSchema: z.object({
		codeSnippet: z.string().min(1),
		...sourceFileTimeoutShape,
	}),
	configure: (command) => {
		command.requiredOption("--code-snippet <swift>", "Swift snippet to execute.");
		configureSourceFileTimeoutCommand(command, {
			sourceHelp: "Source file path.",
		});
	},
	buildArguments: (options) => ({
		codeSnippet: options.codeSnippet,
		sourceFilePath: options.sourceFilePath,
		timeout: options.timeout,
		tabIdentifier: options.tabIdentifier,
	}),
});

const previewRenderCommand = createToolCommand({
	path: ["preview", "render"],
	description: "Render a SwiftUI preview.",
	toolName: "RenderPreview",
	requiresTab: true,
	optionsSchema: z.object({
		previewDefinitionIndexInFile: z.coerce.number().int().nonnegative().optional(),
		...sourceFileTimeoutShape,
	}),
	configure: (command) => {
		configureSourceFileTimeoutCommand(command, {
			includePreviewDefinitionIndex: true,
			sourceHelp: "Preview source file path.",
		});
	},
	buildArguments: (options) => options,
});

const testsRunSomeCommand = createToolCommand({
	path: ["tests", "run-some"],
	description: "Run selected tests from the active test plan.",
	toolName: "RunSomeTests",
	requiresTab: true,
	optionsSchema: z.object({
		test: z.array(z.string()).min(2),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.option(
			"--test <key=value>",
			"Repeatable test specifier field.",
			collectRepeatedStrings,
			[],
		);
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => ({
		tabIdentifier: options.tabIdentifier,
		tests: parseKeyValuePairs(options.test),
	}),
});

const filesGlobCommand = createToolCommand({
	path: ["files", "glob"],
	description: "Glob Xcode project files.",
	toolName: "XcodeGlob",
	requiresTab: true,
	optionsSchema: z.object({
		path: z.string().trim().min(1).optional(),
		pattern: z.string().trim().min(1).optional(),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.option("--path <path>", "Project navigator path.");
		command.option("--pattern <glob>", "Glob pattern.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const filesGrepCommand = createToolCommand({
	path: ["files", "grep"],
	description: "Grep Xcode project files.",
	toolName: "XcodeGrep",
	requiresTab: true,
	optionsSchema: z.object({
		glob: z.string().trim().min(1).optional(),
		headLimit: z.coerce.number().int().positive().optional(),
		ignoreCase: z.boolean().default(false),
		linesAfter: z.coerce.number().int().nonnegative().optional(),
		linesBefore: z.coerce.number().int().nonnegative().optional(),
		linesContext: z.coerce.number().int().nonnegative().optional(),
		multiline: z.boolean().default(false),
		outputMode: outputModeSchema.optional(),
		path: z.string().trim().min(1).optional(),
		pattern: z.string().trim().min(1),
		showLineNumbers: z.boolean().default(false),
		type: z.string().trim().min(1).optional(),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--pattern <regex>", "Content regex.");
		command.option("--glob <glob>", "Filter files by glob.");
		command.option("--head-limit <n>", "Limit matches.");
		command.option("--ignore-case", "Case-insensitive search.");
		command.option("--lines-after <n>", "Lines of trailing context.");
		command.option("--lines-before <n>", "Lines of leading context.");
		command.option("--lines-context <n>", "Lines of surrounding context.");
		command.option("--multiline", "Enable multiline regex.");
		command.option("--output-mode <mode>", "Output mode.");
		command.option("--path <path>", "Project navigator path.");
		command.option("--show-line-numbers", "Show line numbers.");
		command.option("--type <type>", "File type filter.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const filesLsCommand = createToolCommand({
	path: ["files", "ls"],
	description: "List Xcode project files.",
	toolName: "XcodeLS",
	requiresTab: true,
	optionsSchema: z.object({
		ignore: z.array(z.string()).default([]),
		path: z.string().trim().min(1),
		recursive: z.boolean().default(false),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--path <path>", "Project navigator path.");
		command.option("--ignore <pattern>", "Ignore pattern.", collectRepeatedStrings, []);
		command.option("--recursive", "Recurse through directories.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const filesMvCommand = createToolCommand({
	path: ["files", "mv"],
	description: "Move a file or group in Xcode.",
	toolName: "XcodeMV",
	requiresTab: true,
	optionsSchema: z.object({
		destinationPath: z.string().trim().min(1),
		operation: z.string().trim().min(1).optional(),
		overwriteExisting: z.boolean().default(false),
		sourcePath: z.string().trim().min(1),
		yes: z.boolean().default(false),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--source-path <path>", "Source path.");
		command.requiredOption("--destination-path <path>", "Destination path.");
		command.option("--operation <operation>", "Move operation.");
		command.option("--overwrite-existing", "Overwrite an existing destination.");
		command.option("--yes", "Confirm the overwrite.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => {
		requireYes({
			condition: options.overwriteExisting,
			commandName: "files mv --overwrite-existing",
			yes: options.yes,
		});
		return options;
	},
});

const filesMkdirCommand = createToolCommand({
	path: ["files", "mkdir"],
	description: "Create a directory in Xcode.",
	toolName: "XcodeMakeDir",
	requiresTab: true,
	optionsSchema: z.object({
		directoryPath: z.string().trim().min(1),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--directory-path <path>", "Directory path.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const filesRmCommand = createToolCommand({
	path: ["files", "rm"],
	description: "Remove files or groups in Xcode.",
	toolName: "XcodeRM",
	requiresTab: true,
	optionsSchema: z.object({
		deleteFiles: z.boolean().default(false),
		path: z.string().trim().min(1),
		recursive: z.boolean().default(false),
		...yesAndOptionalTabShape,
	}),
	configure: (command) => {
		command.requiredOption("--path <path>", "Path to remove.");
		command.option("--delete-files", "Delete underlying files.");
		command.option("--recursive", "Remove recursively.");
		command.option("--yes", "Confirm removal.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => {
		requireYes({
			condition: true,
			commandName: "files rm",
			yes: options.yes,
		});
		return options;
	},
});

const filesReadCommand = createToolCommand({
	path: ["files", "read"],
	description: "Read a file in Xcode.",
	toolName: "XcodeRead",
	requiresTab: true,
	optionsSchema: z.object({
		filePath: z.string().trim().min(1),
		limit: z.coerce.number().int().positive().optional(),
		offset: z.coerce.number().int().nonnegative().optional(),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--file-path <path>", "File path.");
		command.option("--limit <n>", "Line limit.");
		command.option("--offset <line>", "Line offset.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const issuesFileCommand = createToolCommand({
	path: ["issues", "file"],
	description: "Refresh issues for one file.",
	toolName: "XcodeRefreshCodeIssuesInFile",
	requiresTab: true,
	optionsSchema: z.object({
		filePath: z.string().trim().min(1),
		...optionalTabIdentifierShape,
	}),
	configure: (command) => {
		command.requiredOption("--file-path <path>", "File path.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => options,
});

const filesUpdateCommand = createToolCommand({
	path: ["files", "update"],
	description: "Replace text in a file through Xcode.",
	toolName: "XcodeUpdate",
	requiresTab: true,
	optionsSchema: z.object({
		filePath: z.string().trim().min(1),
		newString: z.string(),
		oldString: z.string(),
		replaceAll: z.boolean().default(false),
		...yesAndOptionalTabShape,
	}),
	configure: (command) => {
		command.requiredOption("--file-path <path>", "File path.");
		command.requiredOption("--old-string <text>", "Text to replace.");
		command.requiredOption("--new-string <text>", "Replacement text.");
		command.option("--replace-all", "Replace every match.");
		command.option("--yes", "Confirm update.");
		addTabIdentifierOption(command);
	},
	buildArguments: (options) => {
		requireYes({
			condition: true,
			commandName: "files update",
			yes: options.yes,
		});
		return options;
	},
});

const filesWriteCommand = createToolCommand({
	path: ["files", "write"],
	description: "Write file content through Xcode.",
	toolName: "XcodeWrite",
	requiresTab: true,
	optionsSchema: z
		.object({
			content: z.string().optional(),
			contentFile: z.string().trim().min(1).optional(),
			filePath: z.string().trim().min(1),
			...yesAndOptionalTabShape,
		})
		.refine((value) => value.content || value.contentFile, {
			message: "Expected --content or --content-file.",
			path: ["content"],
		}),
	configure: (command) => {
		command.requiredOption("--file-path <path>", "File path.");
		command.option("--content <text>", "Content to write.");
		command.option("--content-file <path>", "Read content from a file.");
		command.option("--yes", "Confirm write.");
		addTabIdentifierOption(command);
	},
	buildArguments: async (options) => {
		requireYes({
			condition: true,
			commandName: "files write",
			yes: options.yes,
		});
		return {
			filePath: options.filePath,
			content: await resolveWriteContent(options),
			tabIdentifier: options.tabIdentifier,
		};
	},
});

export const xcodeToolCommandDefinitions = [
	docsSearchCommand,
	snippetExecuteCommand,
	...filteredCommandSpecs.map(createFilteredCommand),
	...tabOnlyCommandSpecs.map(createTabOnlyCommand),
	previewRenderCommand,
	testsRunSomeCommand,
	filesGlobCommand,
	filesGrepCommand,
	filesLsCommand,
	filesMvCommand,
	filesMkdirCommand,
	filesRmCommand,
	filesReadCommand,
	issuesFileCommand,
	filesUpdateCommand,
	filesWriteCommand,
];
