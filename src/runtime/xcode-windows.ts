import { z } from "zod";

const wrappedMessageSchema = z.object({
	message: z.string(),
});

export const xcodeWindowSchema = z.object({
	tabIdentifier: z.string().min(1),
	workspacePath: z.string().min(1),
});

export function readWindowsFromToolResult(input: {
	structuredContent?: {
		message: string;
	};
	text: string;
}): Array<z.infer<typeof xcodeWindowSchema>> {
	return parseWindowsFromText(input.structuredContent?.message ?? input.text);
}

export function normalizeXcodeToolText(text: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith("{")) {
		return text;
	}
	let decoded: unknown;
	try {
		decoded = JSON.parse(trimmed);
	} catch {
		return text;
	}
	const parsed = wrappedMessageSchema.safeParse(decoded);
	if (!parsed.success) {
		return text;
	}
	return parsed.data.message;
}

export function parseWindowsFromText(text: string): Array<z.infer<typeof xcodeWindowSchema>> {
	return normalizeXcodeToolText(text)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("* tabIdentifier: "))
		.flatMap((line) => {
			const match = /^\* tabIdentifier: ([^,]+), workspacePath: (.+)$/.exec(line);
			if (!match?.[1] || !match[2]) {
				return [];
			}
			return [
				{
					tabIdentifier: match[1],
					workspacePath: match[2],
				},
			];
		});
}
