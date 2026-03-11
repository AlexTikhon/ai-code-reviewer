import { Annotation } from "@langchain/langgraph";

export type FindingCategory =
	| "correctness"
	| "security"
	| "performance"
	| "type-safety"
	| "error-handling"
	| "maintainability";

export type FindingConfidence = "low" | "medium" | "high";

export type ReviewerFinding = {
	severity: "high" | "medium" | "low";
	category: FindingCategory;
	confidence: FindingConfidence;
	filename: string;
	title: string;
	explanation: string;
	lineHint?: string;
	suggestion?: string;
};

export type ReviewedFileType =
	| "source"
	| "test"
	| "config"
	| "docs"
	| "lockfile"
	| "generated"
	| "binary"
	| "unknown";

export type SkippedFileReason =
	| "large_patch"
	| "missing_patch"
	| "unsupported_file_type"
	| "generated_file";

export type FilteredFile = {
	filename: string;
	patch: string;
	fileType: ReviewedFileType;
	isTruncated?: boolean;
	originalPatchLength?: number;
};

export type SkippedFile = {
	filename: string;
	fileType: ReviewedFileType;
	reason: SkippedFileReason;
	details?: string;
};

export const reviewerStateAnnotation = Annotation.Root({
	reviewMode: Annotation<"pr" | "local" | undefined>(),
	owner: Annotation<string | undefined>(),
	repo: Annotation<string | undefined>(),
	pullNumber: Annotation<number | undefined>(),
	localBaseRef: Annotation<string | undefined>(),
	localRepoPath: Annotation<string | undefined>(),

	prTitle: Annotation<string | undefined>(),
	prBody: Annotation<string | undefined>(),
	baseRef: Annotation<string | undefined>(),
	headRef: Annotation<string | undefined>(),

	files: Annotation<
		| Array<{
				filename: string;
				status: string;
				additions?: number;
				deletions?: number;
				changes?: number;
				patch?: string;
		  }>
		| undefined
	>(),

	filteredFiles: Annotation<FilteredFile[] | undefined>(),
	skippedFiles: Annotation<SkippedFile[] | undefined>(),

	findings: Annotation<ReviewerFinding[] | undefined>(),
	summary: Annotation<string | undefined>(),
	errors: Annotation<string[] | undefined>()
});

export type ReviewerState = typeof reviewerStateAnnotation.State;
export type ReviewerStateUpdate = typeof reviewerStateAnnotation.Update;
