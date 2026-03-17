import { appendFile, readFile } from "node:fs/promises";
import readline from "node:readline";

const scenarioPath = process.env.XCODE_MCLI_FAKE_MCP_SCENARIO_FILE;

if (!scenarioPath) {
	throw new Error("XCODE_MCLI_FAKE_MCP_SCENARIO_FILE is required.");
}

const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));

if (scenario.eventLogPath) {
	await appendFile(scenario.eventLogPath, `startup:${process.pid}\n`);
}

const rl = readline.createInterface({
	input: process.stdin,
	crlfDelay: Infinity,
});

for await (const line of rl) {
	if (!line.trim()) {
		continue;
	}
	const message = JSON.parse(line);
	if (scenario.eventLogPath) {
		await appendFile(
			scenario.eventLogPath,
			`message:${message.method ?? "response"}\n`,
		);
	}
	if (message.method === "initialize") {
		writeResponse(message.id, {
			protocolVersion: "2025-06-18",
			capabilities: {
				tools: {},
			},
			serverInfo: {
				name: "fake-mcpbridge",
				version: "1.0.0",
			},
		});
		continue;
	}
	if (message.method === "notifications/initialized") {
		continue;
	}
	if (message.method === "tools/list") {
		writeResponse(message.id, {
			tools: scenario.tools ?? [],
		});
		continue;
	}
	if (message.method === "tools/call") {
		if (scenario.eventLogPath) {
			await appendFile(
				scenario.eventLogPath,
				`call:${message.params?.name}:${JSON.stringify(message.params?.arguments ?? {})}\n`,
			);
		}
		const result = scenario.callResults?.[message.params?.name];
		if (!result) {
			writeError(message.id, -32000, `Unknown tool: ${message.params?.name}`);
			continue;
		}
		writeResponse(message.id, result);
		continue;
	}
	writeError(message.id, -32601, `Unknown method: ${message.method}`);
}

function writeError(id, code, message) {
	process.stdout.write(
		JSON.stringify({
			jsonrpc: "2.0",
			id,
			error: {
				code,
				message,
			},
		}) + "\n",
	);
}

function writeResponse(id, result) {
	process.stdout.write(
		JSON.stringify({
			jsonrpc: "2.0",
			id,
			result,
		}) + "\n",
	);
}
