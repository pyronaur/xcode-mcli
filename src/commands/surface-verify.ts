import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runtimeError } from "../core/errors.ts";
import { printCommandResult } from "../runtime/output.ts";
import {
	captureXcodeMcpSurfaceSnapshot,
	diffXcodeMcpSurfaceSnapshots,
	readXcodeMcpSurfaceSnapshotFile,
	xcodeMcpSurfaceDiffHasChanges,
} from "../runtime/xcode-surface.ts";

export const surfaceVerifyCommand = defineCommand({
	path: ["surface", "verify"],
	description: "Compare the live Xcode MCP surface against a baseline snapshot.",
	optionsSchema: z.object({
		baselineFile: z.string().trim().min(1),
	}),
	configure: (command) => {
		command.requiredOption(
			"--baseline-file <path>",
			"Path to a canonical Xcode MCP surface snapshot.",
		);
	},
	run: async ({ commandPath, globals, options, projectDir }) => {
		const baseline = await readXcodeMcpSurfaceSnapshotFile(projectDir, options.baselineFile);
		const live = await captureXcodeMcpSurfaceSnapshot();
		const diff = diffXcodeMcpSurfaceSnapshots({
			baseline,
			live,
		});
		if (xcodeMcpSurfaceDiffHasChanges(diff)) {
			throw runtimeError("Xcode MCP surface does not match the baseline snapshot.", diff);
		}
		printCommandResult({
			commandPath,
			globals,
			text: "Xcode MCP surface matches the baseline snapshot.",
			data: {
				baselineFile: options.baselineFile,
				compatible: true,
				diff,
			},
		});
	},
});
