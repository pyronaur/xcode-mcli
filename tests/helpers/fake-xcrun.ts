import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

type FakeToolDefinition = {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	[key: string]: unknown;
};

type FakeSurfaceEntry = {
	name: string;
	[key: string]: unknown;
};

type FakeToolResult = {
	content?: Array<Record<string, unknown>>;
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

type FakeBridgeScenario = {
	callResults?: Record<string, FakeToolResult>;
	eventLogPath?: string;
	prompts?: FakeSurfaceEntry[];
	resources?: FakeSurfaceEntry[];
	tools?: FakeToolDefinition[];
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const fakeBridgeFixturePath = join(currentDir, "..", "fixtures", "fake-mcpbridge.mjs");

export async function createFakeXcrunEnvironment(scenario: FakeBridgeScenario): Promise<{
	stateRoot: string;
	xcrunPath: string;
}> {
	const workspace = await mkdtemp(join(tmpdir(), "xcode-mcli-fake-xcrun-"));
	const scenarioPath = join(workspace, "scenario.json");
	const xcrunPath = join(workspace, "fake-xcrun.sh");
	const stateRoot = join(workspace, "state");
	const script = [
		"#!/bin/sh",
		'if [ "$1" = "--find" ] && [ "$2" = "mcpbridge" ]; then',
		`  echo "${fakeBridgeFixturePath}"`,
		"  exit 0",
		"fi",
		'if [ "$1" = "mcpbridge" ] && [ "$2" = "--help" ]; then',
		'  echo "mcpbridge - STDIO Bridge for Xcode MCP Tools"',
		"  exit 0",
		"fi",
		'if [ "$1" = "mcpbridge" ]; then',
		`  export XCODE_MCLI_FAKE_MCP_SCENARIO_FILE="${scenarioPath}"`,
		`  exec "${process.execPath}" "${fakeBridgeFixturePath}"`,
		"fi",
		'echo "unexpected args: $@" >&2',
		"exit 1",
	].join("\n");
	await writeFile(scenarioPath, JSON.stringify(scenario, null, 2));
	await writeFile(xcrunPath, script);
	await chmod(xcrunPath, 0o755);
	return {
		stateRoot,
		xcrunPath,
	};
}
