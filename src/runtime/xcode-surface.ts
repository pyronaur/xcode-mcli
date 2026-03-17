import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { readXcodeMcpSurface } from "./xcode-client.ts";

type SurfaceItem = {
	name: string;
	[key: string]: unknown;
};

type SurfaceDelta = {
	added: string[];
	changed: string[];
	removed: string[];
};

export type XcodeMcpSurfaceSnapshot = {
	protocolVersion: string;
	prompts: SurfaceItem[];
	resources: SurfaceItem[];
	tools: SurfaceItem[];
};

export type XcodeMcpSurfaceDiff = {
	protocolVersionChanged: boolean;
	prompts: SurfaceDelta;
	resources: SurfaceDelta;
	tools: SurfaceDelta;
};

const surfaceItemSchema = z.object({
	name: z.string().min(1),
}).catchall(z.unknown());

const xcodeMcpSurfaceSnapshotSchema = z.object({
	protocolVersion: z.string().min(1),
	prompts: z.array(surfaceItemSchema).default([]),
	resources: z.array(surfaceItemSchema).default([]),
	tools: z.array(surfaceItemSchema).default([]),
});

function sortObjectKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sortObjectKeys(item));
	}
	if (!value || typeof value !== "object") {
		return value;
	}
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, itemValue]) => [key, sortObjectKeys(itemValue)]),
	);
}

function normalizeNamedItems(items: SurfaceItem[]): SurfaceItem[] {
	return items
		.map((item) => surfaceItemSchema.parse(sortObjectKeys(item)))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function createSurfaceDelta(input: {
	baseline: SurfaceItem[];
	live: SurfaceItem[];
}): SurfaceDelta {
	const baselineByName = new Map(input.baseline.map((item) => [item.name, item]));
	const liveByName = new Map(input.live.map((item) => [item.name, item]));
	const added = [...liveByName.keys()].filter((name) => !baselineByName.has(name)).sort();
	const removed = [...baselineByName.keys()].filter((name) => !liveByName.has(name)).sort();
	const changed = [...baselineByName.keys()]
		.filter((name) => liveByName.has(name))
		.filter((name) => {
			return JSON.stringify(baselineByName.get(name)) !== JSON.stringify(liveByName.get(name));
		})
		.sort();
	return {
		added,
		changed,
		removed,
	};
}

function hasDelta(delta: SurfaceDelta): boolean {
	return delta.added.length > 0 || delta.changed.length > 0 || delta.removed.length > 0;
}

export function normalizeXcodeMcpSurfaceSnapshot(
	snapshot: XcodeMcpSurfaceSnapshot,
): XcodeMcpSurfaceSnapshot {
	const parsed = xcodeMcpSurfaceSnapshotSchema.parse(snapshot);
	return {
		protocolVersion: parsed.protocolVersion,
		prompts: normalizeNamedItems(parsed.prompts),
		resources: normalizeNamedItems(parsed.resources),
		tools: normalizeNamedItems(parsed.tools),
	};
}

export async function captureXcodeMcpSurfaceSnapshot(): Promise<XcodeMcpSurfaceSnapshot> {
	return normalizeXcodeMcpSurfaceSnapshot(await readXcodeMcpSurface());
}

export function diffXcodeMcpSurfaceSnapshots(input: {
	baseline: XcodeMcpSurfaceSnapshot;
	live: XcodeMcpSurfaceSnapshot;
}): XcodeMcpSurfaceDiff {
	const baseline = normalizeXcodeMcpSurfaceSnapshot(input.baseline);
	const live = normalizeXcodeMcpSurfaceSnapshot(input.live);
	return {
		protocolVersionChanged: baseline.protocolVersion !== live.protocolVersion,
		prompts: createSurfaceDelta({
			baseline: baseline.prompts,
			live: live.prompts,
		}),
		resources: createSurfaceDelta({
			baseline: baseline.resources,
			live: live.resources,
		}),
		tools: createSurfaceDelta({
			baseline: baseline.tools,
			live: live.tools,
		}),
	};
}

export function xcodeMcpSurfaceDiffHasChanges(diff: XcodeMcpSurfaceDiff): boolean {
	return diff.protocolVersionChanged
		|| hasDelta(diff.prompts)
		|| hasDelta(diff.resources)
		|| hasDelta(diff.tools);
}

export async function readXcodeMcpSurfaceSnapshotFile(
	projectDir: string,
	filePath: string,
): Promise<XcodeMcpSurfaceSnapshot> {
	const resolvedPath = resolve(projectDir, filePath);
	try {
		return normalizeXcodeMcpSurfaceSnapshot(
			JSON.parse(await readFile(resolvedPath, "utf8")),
		);
	} catch (error) {
		if (error instanceof Error) {
			throw runtimeError(
				`Failed to read Xcode MCP surface snapshot from ${resolvedPath}. ${error.message}`,
			);
		}
		throw runtimeError(`Failed to read Xcode MCP surface snapshot from ${resolvedPath}.`);
	}
}

export async function writeXcodeMcpSurfaceSnapshotFile(input: {
	filePath: string;
	projectDir: string;
	snapshot: XcodeMcpSurfaceSnapshot;
}): Promise<string> {
	const resolvedPath = resolve(input.projectDir, input.filePath);
	await mkdir(dirname(resolvedPath), { recursive: true });
	await writeFile(
		resolvedPath,
		`${JSON.stringify(normalizeXcodeMcpSurfaceSnapshot(input.snapshot), null, 2)}\n`,
	);
	return resolvedPath;
}
