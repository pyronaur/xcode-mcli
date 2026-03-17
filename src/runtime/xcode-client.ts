import { spawn } from "node:child_process";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { resolveXcrunPath } from "./env.ts";
import { JsonRpcPeer } from "./mcp-jsonrpc.ts";
import { type XcodeToolDefinition, xcodeToolDefinitionSchema } from "./xcode-tool-definition.ts";
import { normalizeXcodeToolText } from "./xcode-windows.ts";

type XcodeToolCallResult = {
	content: Array<Record<string, unknown>>;
	isError: boolean;
	structuredContent?: unknown;
	text: string;
};

type XcodeBridgeClient = {
	bridgeProcessId?: number;
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

function readTextContent(content: Array<Record<string, unknown>>): string {
	return normalizeXcodeToolText(
		content
			.filter((item) => item.type === "text" && typeof item.text === "string")
			.map((item) => String(item.text))
			.join(""),
	);
}

function parseStructuredContentFromText(text: string): unknown {
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return undefined;
	}
	if (!parsed || typeof parsed !== "object") {
		return undefined;
	}
	if ("message" in parsed && typeof parsed.message === "string") {
		return undefined;
	}
	return parsed;
}

function toToolCallResult(result: unknown): XcodeToolCallResult {
	const payload = toolCallResultSchema.parse(result ?? {});
	const content = payload.content;
	const text = readTextContent(content);
	return {
		content,
		isError: payload.isError,
		structuredContent: payload.structuredContent ?? parseStructuredContentFromText(text),
		text,
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

const listToolsResultSchema = z.object({
	tools: z.array(xcodeToolDefinitionSchema).default([]),
});
const toolCallResultSchema = z.object({
	content: z.array(z.record(z.string(), z.unknown())).default([]),
	isError: z.boolean().default(false),
	structuredContent: z.unknown().optional(),
});

export async function createXcodeBridgeClient(): Promise<XcodeBridgeClient> {
	const child = spawn(resolveXcrunPath(), ["mcpbridge"], {
		stdio: ["pipe", "pipe", "pipe"],
		env: process.env,
	});
	const peer = new JsonRpcPeer(child);
	await initializeClient(peer);
	let cachedTools: XcodeToolDefinition[] | null = null;
	return {
		bridgeProcessId: child.pid,
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
