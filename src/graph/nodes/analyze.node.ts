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
	const skippedFiles = state.skippedFiles ?? [];
	const findings: ReviewerFinding[] = [];
	const summaryParts: string[] = [];
	const errors = [...(state.errors ?? [])];

	const structuredLlm = llm.withStructuredOutput(reviewResponseSchema);

	for (const skippedFile of skippedFiles) {
		summaryParts.push(
			`- ${skippedFile.filename}: skipped (${skippedFile.reason}${
				skippedFile.details ? `, ${skippedFile.details}` : ""
			})`
		);
	}

	for (const file of filteredFiles) {
		try {
			const result = await structuredLlm.invoke(
				buildReviewPrompt({
					prTitle: state.prTitle ?? "",
					prBody: state.prBody ?? "",
					filename: file.filename,
					fileType: file.fileType,
					patch: file.patch,
					isTruncated: file.isTruncated,
					originalPatchLength: file.originalPatchLength
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
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown analyzeNode error";
			errors.push(`Failed to analyze ${file.filename}: ${message}`);
			summaryParts.push(`- ${file.filename}: analysis failed (${message})`);
		}
	}

	return {
		findings,
		summary: summaryParts.join("\n"),
		errors
	};
}
