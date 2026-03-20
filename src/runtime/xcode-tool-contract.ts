import { z } from "zod";

const textItemSchema = z.record(z.string(), z.unknown());

const buildErrorSchema = z.object({
	classification: z.string(),
	filePath: z.string().optional(),
	lineNumber: z.int().optional(),
	message: z.string(),
});

const documentationDocumentSchema = z.object({
	title: z.string(),
	uri: z.string(),
	contents: z.string(),
	score: z.number(),
});

const toolErrorSchema = z.object({
	message: z.string(),
});

const buildLogIssueSchema = z.object({
	line: z.int(),
	severity: z.string(),
	message: z.string(),
	path: z.string().optional(),
});

const buildLogEntrySchema = z.object({
	buildTask: z.string().optional(),
	emittedIssues: z.array(buildLogIssueSchema),
});

const testListItemSchema = z.object({
	targetName: z.string(),
	identifier: z.string(),
	displayName: z.string(),
	isEnabled: z.boolean(),
	filePath: z.string().optional(),
	lineNumber: z.int().optional(),
	tags: z.array(z.string()).optional(),
});

const testCountsSchema = z.object({
	total: z.int(),
	passed: z.int(),
	failed: z.int(),
	skipped: z.int(),
	expectedFailures: z.int(),
	notRun: z.int(),
});

const testResultSchema = z.object({
	targetName: z.string(),
	identifier: z.string(),
	displayName: z.string(),
	state: z.string(),
});

const testRunResultSchema = z.object({
	activeTestPlanName: z.string().optional(),
	counts: testCountsSchema,
	message: z.string().optional(),
	results: z.array(testResultSchema),
	schemeName: z.string(),
	summary: z.string(),
	totalResults: z.int(),
	truncated: z.boolean(),
});

const navigatorIssueSchema = z.object({
	message: z.string(),
	severity: z.string(),
	category: z.string().optional(),
	line: z.int().optional(),
	path: z.string().optional(),
	vitality: z.enum(["fresh", "stale"]).optional(),
});

const rawToolCallResultSchema = z.object({
	content: z.array(textItemSchema).default([]),
	isError: z.boolean().default(false),
	structuredContent: z.unknown().optional(),
	text: z.string().default(""),
});

export type ToolName = keyof typeof toolResultContract;
export type RawToolCallResult = z.output<typeof rawToolCallResultSchema>;
export type ToolStructuredResult<K extends ToolName> = ReturnType<
	(typeof toolResultContract)[K]["parse"]
>;
export type ToolCallResult<K extends ToolName> = Omit<RawToolCallResult, "structuredContent"> & {
	structuredContent: ToolStructuredResult<K> | undefined;
};

type ToolResultParserMap = {
	[K in ToolName]: (value: unknown) => ToolStructuredResult<K>;
};

const toolResultParsers: ToolResultParserMap = {
	BuildProject: (value) => toolResultContract.BuildProject.parse(value),
	DocumentationSearch: (value) => toolResultContract.DocumentationSearch.parse(value),
	ExecuteSnippet: (value) => toolResultContract.ExecuteSnippet.parse(value),
	GetBuildLog: (value) => toolResultContract.GetBuildLog.parse(value),
	GetTestList: (value) => toolResultContract.GetTestList.parse(value),
	RenderPreview: (value) => toolResultContract.RenderPreview.parse(value),
	RunAllTests: (value) => toolResultContract.RunAllTests.parse(value),
	RunSomeTests: (value) => toolResultContract.RunSomeTests.parse(value),
	XcodeGlob: (value) => toolResultContract.XcodeGlob.parse(value),
	XcodeGrep: (value) => toolResultContract.XcodeGrep.parse(value),
	XcodeLS: (value) => toolResultContract.XcodeLS.parse(value),
	XcodeListNavigatorIssues: (value) => toolResultContract.XcodeListNavigatorIssues.parse(value),
	XcodeListWindows: (value) => toolResultContract.XcodeListWindows.parse(value),
	XcodeMV: (value) => toolResultContract.XcodeMV.parse(value),
	XcodeMakeDir: (value) => toolResultContract.XcodeMakeDir.parse(value),
	XcodeRM: (value) => toolResultContract.XcodeRM.parse(value),
	XcodeRead: (value) => toolResultContract.XcodeRead.parse(value),
	XcodeRefreshCodeIssuesInFile: (value) =>
		toolResultContract.XcodeRefreshCodeIssuesInFile.parse(
			value,
		),
	XcodeUpdate: (value) => toolResultContract.XcodeUpdate.parse(value),
	XcodeWrite: (value) => toolResultContract.XcodeWrite.parse(value),
};

export function parseRawToolCallResult(result: unknown): RawToolCallResult {
	return rawToolCallResultSchema.parse(result ?? {});
}

export function validateToolCallResult<K extends ToolName>(
	toolName: K,
	result: RawToolCallResult,
): ToolCallResult<K> {
	if (result.structuredContent === undefined) {
		return {
			...result,
			structuredContent: undefined,
		};
	}
	const structuredContent = toolResultParsers[toolName](result.structuredContent);
	return {
		...result,
		structuredContent,
	};
}

export const toolResultContract = {
	BuildProject: z.object({
		buildResult: z.string(),
		elapsedTime: z.number().optional(),
		errors: z.array(buildErrorSchema),
	}),
	DocumentationSearch: z.object({
		documents: z.array(documentationDocumentSchema),
	}),
	ExecuteSnippet: z.object({
		error: toolErrorSchema.optional(),
		executionResults: z.string().optional(),
	}),
	GetBuildLog: z.object({
		buildResult: z.string(),
		buildLogEntries: z.array(buildLogEntrySchema),
		buildIsRunning: z.boolean(),
		fullLogPath: z.string(),
		message: z.string().optional(),
		totalFound: z.int(),
		truncated: z.boolean(),
	}),
	GetTestList: z.object({
		activeTestPlanName: z.string().optional(),
		schemeName: z.string(),
		tests: z.array(testListItemSchema),
	}),
	RenderPreview: z.object({
		error: toolErrorSchema.optional(),
		previewSnapshotPath: z.string().optional(),
	}),
	RunAllTests: testRunResultSchema,
	RunSomeTests: testRunResultSchema,
	XcodeGlob: z.object({
		matches: z.array(z.string()),
		message: z.string().optional(),
		pattern: z.string(),
		searchPath: z.string(),
		totalFound: z.int(),
		truncated: z.boolean(),
	}),
	XcodeGrep: z.object({
		matchCount: z.int(),
		message: z.string().optional(),
		pattern: z.string(),
		results: z.array(z.string()),
		searchPath: z.string(),
		truncated: z.boolean(),
	}),
	XcodeLS: z.object({
		items: z.array(z.string()),
		path: z.string(),
	}),
	XcodeListNavigatorIssues: z.object({
		issues: z.array(navigatorIssueSchema),
		message: z.string().optional(),
		totalFound: z.int(),
		truncated: z.boolean(),
	}),
	XcodeListWindows: z.object({
		message: z.string(),
	}),
	XcodeMV: z.object({
		destinationFinalPath: z.string().optional(),
		message: z.string(),
		operation: z.string(),
		sourceOriginalPath: z.string().optional(),
		success: z.boolean(),
	}),
	XcodeMakeDir: z.object({
		createdPath: z.string().optional(),
		message: z.string(),
		success: z.boolean(),
	}),
	XcodeRM: z.object({
		message: z.string(),
		removedPath: z.string(),
		success: z.boolean(),
	}),
	XcodeRead: z.object({
		content: z.string(),
		filePath: z.string(),
		fileSize: z.int(),
		linesRead: z.int(),
		startLine: z.int(),
		totalLines: z.int(),
	}),
	XcodeRefreshCodeIssuesInFile: z.object({
		content: z.string(),
		diagnosticsCount: z.int(),
		filePath: z.string(),
		success: z.boolean(),
	}),
	XcodeUpdate: z.object({
		editsApplied: z.int(),
		filePath: z.string(),
		message: z.string().optional(),
		modifiedContentLength: z.int(),
		originalContentLength: z.int(),
		success: z.boolean(),
	}),
	XcodeWrite: z.object({
		absolutePath: z.string().optional(),
		bytesWritten: z.int(),
		filePath: z.string(),
		linesWritten: z.int(),
		message: z.string(),
		success: z.boolean(),
		wasExistingFile: z.boolean(),
	}),
} as const;
