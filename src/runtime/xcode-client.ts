import { spawn } from "node:child_process";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { resolveXcrunPath } from "./env.ts";
import { JsonRpcPeer } from "./mcp-jsonrpc.ts";
import { normalizeXcodeToolText } from "./xcode-windows.ts";

type XcodeToolDefinition = {
	description?: string;
	inputSchema?: Record<string, unknown>;
	name: string;
};

type XcodeToolCallResult = {
	content: Array<Record<string, unknown>>;
	isError: boolean;
	structuredContent?: Record<string, unknown>;
	text: string;
};

type XcodeBridgeClient = {
	callTool(
		input: { arguments: Record<string, unknown>; name: string },
	): Promise<XcodeToolCallResult>;
	close(): Promise<void>;
	listTools(): Promise<XcodeToolDefinition[]>;
};

const MCP_PROTOCOL_VERSION = "2025-06-18";
const initializeResultSchema = z.object({
	protocolVersion: z.string().min(1),
});
const toolDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	inputSchema: z.record(z.string(), z.unknown()).optional(),
});
const listToolsResultSchema = z.object({
	tools: z.array(toolDefinitionSchema).default([]),
});
const toolCallResultSchema = z.object({
	content: z.array(z.record(z.string(), z.unknown())).default([]),
	isError: z.boolean().default(false),
	structuredContent: z.record(z.string(), z.unknown()).optional(),
});

function readTextContent(content: Array<Record<string, unknown>>): string {
	return normalizeXcodeToolText(
		content
			.filter((item) => item.type === "text" && typeof item.text === "string")
			.map((item) => String(item.text))
			.join(""),
	);
}

function toToolCallResult(result: unknown): XcodeToolCallResult {
	const payload = toolCallResultSchema.parse(result ?? {});
	const content = payload.content;
	return {
		content,
		isError: payload.isError,
		structuredContent: payload.structuredContent,
		text: readTextContent(content),
	};
}

async function initializeClient(peer: JsonRpcPeer): Promise<void> {
	const result = initializeResultSchema.parse(
		await peer.request("initialize", {
			protocolVersion: MCP_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: {
				name: "xcode-mcli",
				version: "0.1.0",
			},
		}),
	);
	if (!result.protocolVersion) {
		throw runtimeError("Bridge initialize did not return a protocol version.");
	}
	peer.notify("notifications/initialized", {});
}

export async function createXcodeBridgeClient(): Promise<XcodeBridgeClient> {
	const child = spawn(resolveXcrunPath(), ["mcpbridge"], {
		stdio: ["pipe", "pipe", "pipe"],
		env: process.env,
	});
	const peer = new JsonRpcPeer(child);
	await initializeClient(peer);
	let cachedTools: XcodeToolDefinition[] | null = null;
	return {
		listTools: async () => {
			if (cachedTools) {
				return cachedTools;
			}
			const result = listToolsResultSchema.parse(await peer.request("tools/list", {}));
			cachedTools = result.tools;
			return cachedTools;
		},
		callTool: async ({ name, arguments: toolArguments }) => {
			const result = await peer.request("tools/call", {
				name,
				arguments: toolArguments,
			});
			return toToolCallResult(result);
		},
		close: async () => {
			await peer.close();
		},
	};
}
