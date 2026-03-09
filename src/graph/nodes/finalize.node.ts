import type { ReviewerState, ReviewerStateUpdate } from "../state.js";

export async function finalizeNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	const findings = state.findings ?? [];

	if (!findings.length) {
		return {
			summary:
				state.summary ||
				"No meaningful issues found in the reviewed patch."
		};
	}

	const counts = findings.reduce(
		(acc, item) => {
			acc[item.severity]++;
			return acc;
		},
		{ high: 0, medium: 0, low: 0 }
	);

	const header = `Review completed. Findings: high=${counts.high}, medium=${counts.medium}, low=${counts.low}.`;

	return {
		summary: `${header}\n\n${state.summary ?? ""}`.trim()
	};
}
