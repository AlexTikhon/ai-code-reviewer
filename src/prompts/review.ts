export function buildReviewPrompt(input: {
	prTitle: string;
	prBody: string;
	filename: string;
	patch: string;
}): string {
	return `
You are a senior code reviewer.

Review the patch for real engineering issues only.
Focus on:
- correctness
- bugs
- unsafe assumptions
- type safety
- error handling
- maintainability

Do NOT comment on trivial formatting or subjective style preferences.
Return only issues that are likely meaningful.

PR title:
${input.prTitle}

PR description:
${input.prBody}

File:
${input.filename}

Patch:
${input.patch}
`;
}
