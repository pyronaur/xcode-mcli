import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runXcodeMcli } from "../../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./console.ts";
import { createFakeXcrunEnvironment } from "./fake-xcrun.ts";

type FakeToolDefinition = {
	description?: string;
	inputSchema?: Record<string, unknown>;
	name: string;
};

type FakeToolResult = {
	content?: Array<Record<string, unknown>>;
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

type LoggedCall = {
	arguments: Record<string, unknown>;
	name: string;
};

function parseLoggedCalls(log: string): LoggedCall[] {
	return log
		.trim()
		.split("\n")
		.filter((line) => line.startsWith("call:"))
		.map((line) => {
			const nameStart = "call:".length;
			const nameEnd = line.indexOf(":", nameStart);
			const name = line.slice(nameStart, nameEnd);
			const json = line.slice(nameEnd + 1);
			return {
				name,
				arguments: JSON.parse(json),
			};
		});
}

export async function runCommandWithFakeBridge(input: {
	args: string[];
	callResults: Record<string, FakeToolResult>;
	tools: FakeToolDefinition[];
}): Promise<{
	calls: LoggedCall[];
	lines: string[];
}> {
	const workspace = await mkdtemp(join(tmpdir(), "xcode-mcli-command-run-"));
	const eventLogPath = join(workspace, "events.log");
	const environment = await createFakeXcrunEnvironment({
		eventLogPath,
		tools: input.tools,
		callResults: input.callResults,
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(input.args, process.cwd());
		});
		const log = await readFile(eventLogPath, "utf8");
		return {
			lines,
			calls: parseLoggedCalls(log),
		};
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
}
