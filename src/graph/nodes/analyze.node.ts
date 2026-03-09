import type {
	ReviewerState,
	ReviewerFinding,
	ReviewerStateUpdate
} from "../state.js";
import { llm } from "../../config/llm.js";
import { buildReviewPrompt } from "../../prompts/review.js";
import { reviewResponseSchema } from "../../schemas/review.schema.js";

export async function analyzeNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	const filteredFiles = state.filteredFiles ?? [];
	const findings: ReviewerFinding[] = [];
	const summaryParts: string[] = [];

	const structuredLlm = llm.withStructuredOutput(reviewResponseSchema);

	for (const file of filteredFiles) {
		const result = await structuredLlm.invoke(
			buildReviewPrompt({
				prTitle: state.prTitle ?? "",
				prBody: state.prBody ?? "",
				filename: file.filename,
				patch: file.patch
			})
		);

		for (const finding of result.findings) {
			findings.push({
				...finding,
				filename: file.filename
			});
		}

		if (result.summary) {
			summaryParts.push(`- ${file.filename}: ${result.summary}`);
		}
	}

	return {
		findings,
		summary: summaryParts.join("\n")
	};
}
