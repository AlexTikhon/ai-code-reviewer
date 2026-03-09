import type { ReviewerState, ReviewerStateUpdate } from "../state.js";

const IGNORE_PATTERNS = [
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	".snap",
	"dist/",
	"build/",
	".next/",
	"coverage/"
];

function shouldIgnore(filename: string): boolean {
	return IGNORE_PATTERNS.some((pattern) => filename.includes(pattern));
}

export async function filterFilesNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	const files = state.files ?? [];

	const filteredFiles = files
		.filter((file) => file.patch)
		.filter((file) => !shouldIgnore(file.filename))
		.filter((file) => (file.patch?.length ?? 0) < 15000)
		.map((file) => ({
			filename: file.filename,
			patch: file.patch!
		}));

	return { filteredFiles };
}
