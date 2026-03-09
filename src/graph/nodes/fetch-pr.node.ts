import type { ReviewerState, ReviewerStateUpdate } from "../state.js";
import { getPullRequest, getPullRequestFiles } from "../../github/pulls.js";

export async function fetchPrNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	try {
		const pr = await getPullRequest(state.owner, state.repo, state.pullNumber);
		const files = await getPullRequestFiles(
			state.owner,
			state.repo,
			state.pullNumber
		);

		return {
			prTitle: pr.title,
			prBody: pr.body ?? "",
			baseRef: pr.base.ref,
			headRef: pr.head.ref,
			files
		};
	} catch (error) {
		return {
			errors: [
				...(state.errors ?? []),
				error instanceof Error ? error.message : "Unknown fetchPrNode error"
			]
		};
	}
}
