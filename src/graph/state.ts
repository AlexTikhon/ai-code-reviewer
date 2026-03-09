import { Annotation } from "@langchain/langgraph";

export type ReviewerFinding = {
	severity: "high" | "medium" | "low";
	filename: string;
	title: string;
	explanation: string;
	suggestion?: string;
};

export const reviewerStateAnnotation = Annotation.Root({
	owner: Annotation<string>(),
	repo: Annotation<string>(),
	pullNumber: Annotation<number>(),

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

	filteredFiles: Annotation<
		| Array<{
				filename: string;
				patch: string;
		  }>
		| undefined
	>(),

	findings: Annotation<ReviewerFinding[] | undefined>(),
	summary: Annotation<string | undefined>(),
	errors: Annotation<string[] | undefined>()
});

export type ReviewerState = typeof reviewerStateAnnotation.State;
export type ReviewerStateUpdate = typeof reviewerStateAnnotation.Update;
