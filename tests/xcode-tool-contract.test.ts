import { readFile } from "node:fs/promises";

import { expect, test } from "vitest";
import { z } from "zod";

import { commandDefinitions } from "../src/commands/index.ts";
import { isToolCommandDefinition } from "../src/core/contracts.ts";
import { callDaemonTool, stopDaemon } from "../src/runtime/daemon-host.ts";
import { toolResultContract } from "../src/runtime/xcode-tool-contract.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

type SurfaceSnapshot = {
	tools: Array<{
		name: string;
		outputSchema?: unknown;
	}>;
};

function normalizeSchema(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map((value) => normalizeSchema(value));
	}
	if (!input || typeof input !== "object") {
		return input;
	}
	const candidate = input as Record<string, unknown>;
	const normalized: Record<string, unknown> = {};
	if ("type" in candidate) {
		normalized.type = candidate.type;
	}
	if ("enum" in candidate && Array.isArray(candidate.enum)) {
		normalized.enum = [...candidate.enum].sort();
	}
	if ("required" in candidate && Array.isArray(candidate.required)) {
		const required = [...candidate.required].sort();
		if (required.length > 0) {
			normalized.required = required;
		}
	}
	if ("items" in candidate) {
		normalized.items = normalizeSchema(candidate.items);
	}
	if ("properties" in candidate && candidate.properties && typeof candidate.properties === "object") {
		const properties = candidate.properties as Record<string, unknown>;
		normalized.properties = Object.fromEntries(
			Object.keys(properties).sort().map((key) => [key, normalizeSchema(properties[key])]),
		);
	}
	return normalized;
}

test("tool result contract matches the pinned Xcode output schemas", async () => {
	const snapshot = JSON.parse(
		await readFile("skill/references/apple-xcode-26.3.surface.json", "utf8"),
	) as SurfaceSnapshot;
	const snapshotOutputSchemas = Object.fromEntries(
		snapshot.tools
			.filter((tool) => tool.name in toolResultContract)
			.map((tool) => [tool.name, normalizeSchema(tool.outputSchema)]),
	);
	const contractOutputSchemas = Object.fromEntries(
		Object.entries(toolResultContract).map(([toolName, schema]) => [
			toolName,
			normalizeSchema(z.toJSONSchema(schema)),
		]),
	);
	expect(contractOutputSchemas).toEqual(snapshotOutputSchemas);
});

test("tool-backed commands are exhaustively covered by the shared tool contract", () => {
	const toolNames = commandDefinitions
		.filter(isToolCommandDefinition)
		.map((definition) => definition.toolName)
		.sort();
	expect(toolNames).toEqual(Object.keys(toolResultContract).sort());
});

test("daemon tool boundary validates the real XcodeListWindows payload shape", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeListWindows: {
				content: [
					{
						type: "text",
						text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
					},
				],
				structuredContent: {
					message: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
				},
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		await expect(
			callDaemonTool({
				name: "XcodeListWindows",
				arguments: {},
			}),
		).resolves.toEqual(
			expect.objectContaining({
				structuredContent: {
					message: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
				},
				text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
			}),
		);
	} finally {
		await stopDaemon();
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});
