import { githubRequest } from "./client.js";
import type { PullRequestFile, PullRequestResponse } from "./types.js";

export async function getPullRequest(
	owner: string,
	repo: string,
	pullNumber: number
): Promise<PullRequestResponse> {
	return githubRequest<PullRequestResponse>(
		`/repos/${owner}/${repo}/pulls/${pullNumber}`
	);
}

export async function getPullRequestFiles(
	owner: string,
	repo: string,
	pullNumber: number
): Promise<PullRequestFile[]> {
	return githubRequest<PullRequestFile[]>(
		`/repos/${owner}/${repo}/pulls/${pullNumber}/files`
	);
}
