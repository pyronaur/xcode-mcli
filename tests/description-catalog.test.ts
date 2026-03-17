import { expect, test } from "vitest";

import { commandDefinitions } from "../src/commands/index.ts";
import {
	describeCommandGroup,
	describeToolCommand,
} from "../src/core/description-catalog.ts";

test("each registered command group resolves to an explicit description", () => {
	const groups = new Set(
		commandDefinitions
			.map((definition) => definition.path[0])
			.filter((segment, index, segments) =>
				commandDefinitions.some((definition) =>
					definition.path[0] === segment && definition.path.length > 1 &&
					segments.indexOf(segment) === index
				)
			),
	);

	for (const group of groups) {
		expect(describeCommandGroup(group)).toBeTruthy();
		expect(describeCommandGroup(group)).not.toBe(`${group} commands.`);
	}
});

test("tool-backed commands prefer native Xcode MCP descriptions when available", () => {
	expect(describeToolCommand("DocumentationSearch", "fallback description")).not.toBe(
		"fallback description",
	);
	expect(describeToolCommand("DocumentationSearch", "")).toBeTruthy();
	expect(describeToolCommand("UnknownTool", "fallback description")).toBe(
		"fallback description",
	);
});
