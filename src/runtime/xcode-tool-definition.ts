import { z } from "zod";

export type XcodeToolDefinition = {
	description?: string;
	inputSchema?: Record<string, unknown>;
	name: string;
};

export const xcodeToolDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	inputSchema: z.record(z.string(), z.unknown()).optional(),
});
