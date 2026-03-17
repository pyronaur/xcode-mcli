import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { printCommandResult } from "../runtime/output.ts";
import {
	captureXcodeMcpSurfaceSnapshot,
	writeXcodeMcpSurfaceSnapshotFile,
} from "../runtime/xcode-surface.ts";

export const surfaceSnapshotCommand = defineCommand({
	path: ["surface", "snapshot"],
	description: "Capture the live Xcode MCP surface.",
	optionsSchema: z.object({
		outputFile: z.string().trim().min(1).optional(),
	}),
	configure: (command) => {
		command.option("--output-file <path>", "Write the canonical snapshot to a file.");
	},
	run: async ({ commandPath, globals, options, projectDir }) => {
		const snapshot = await captureXcodeMcpSurfaceSnapshot();
		if (options.outputFile) {
			const outputPath = await writeXcodeMcpSurfaceSnapshotFile({
				projectDir,
				filePath: options.outputFile,
				snapshot,
			});
			printCommandResult({
				commandPath,
				globals,
				text: `Wrote Xcode MCP surface snapshot to ${outputPath}`,
				data: {
					outputFile: outputPath,
					snapshot,
				},
			});
			return;
		}
		printCommandResult({
			commandPath,
			globals,
			text: JSON.stringify(snapshot, null, 2),
			data: snapshot,
		});
	},
});
