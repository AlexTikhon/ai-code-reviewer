import type {
	ReviewerState,
	ReviewerFinding,
	ReviewerStateUpdate
} from "../state.js";
import { llm } from "../../config/llm.js";
import { buildReviewPrompt } from "../../prompts/review.js";
import { reviewResponseSchema } from "../../schemas/review.schema.js";
import {
	consoleStyles,
	errorLabel,
	progressLabel,
	successLabel,
	warningLabel
} from "../../utils/console.js";

export async function analyzeNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	const filteredFiles = state.filteredFiles ?? [];
	const skippedFiles = state.skippedFiles ?? [];
	const findings: ReviewerFinding[] = [];
	const summaryParts: string[] = [];
	const errors = [...(state.errors ?? [])];

	const structuredLlm = llm.withStructuredOutput(reviewResponseSchema);

	console.log(
		`${progressLabel("[analyze]")} Reviewing ${filteredFiles.length} file(s); skipped ${skippedFiles.length}.`
	);

	for (const skippedFile of skippedFiles) {
		summaryParts.push(
			`- ${skippedFile.filename}: skipped (${skippedFile.reason}${
				skippedFile.details ? `, ${skippedFile.details}` : ""
			})`
		);
	}

	for (const [index, file] of filteredFiles.entries()) {
		console.log(
			`${progressLabel("[analyze]")} (${index + 1}/${filteredFiles.length}) ${consoleStyles.bold(file.filename)}${
				file.isTruncated ? ` ${warningLabel("[truncated]")}` : ""
			}`
		);
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
					severity: finding.severity,
					category: finding.category,
					confidence: finding.confidence,
					filename: file.filename,
					title: finding.title,
					explanation: finding.explanation,
					lineHint: finding.lineHint ?? undefined,
					suggestion: finding.suggestion ?? undefined
				});
			}

			if (result.summary) {
				summaryParts.push(`- ${file.filename}: ${result.summary}`);
			}
			console.log(
				`${successLabel("[analyze]")} Completed ${consoleStyles.bold(file.filename)}.`
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown analyzeNode error";
			errors.push(`Failed to analyze ${file.filename}: ${message}`);
			summaryParts.push(`- ${file.filename}: analysis failed (${message})`);
			console.log(
				`${errorLabel("[analyze]")} Failed ${consoleStyles.bold(
					file.filename
				)}: ${message}`
			);
		}
	}

	return {
		findings,
		summary: summaryParts.join("\n"),
		errors
	};
}
