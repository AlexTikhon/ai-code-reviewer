import type {
	FilteredFile,
	ReviewedFileType,
	ReviewerState,
	ReviewerStateUpdate,
	SkippedFile
} from "../state.js";

const MAX_PATCH_LENGTH = 15000;

const LOCKFILE_NAMES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
const GENERATED_PATTERNS = [".snap", "dist/", "build/", ".next/", "coverage/"];
const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".kt",
	".swift",
	".cs",
	".cpp",
	".cc",
	".c",
	".h",
	".hpp",
	".php"
]);
const TEST_MARKERS = [".test.", ".spec.", "__tests__/", "/test/", "/tests/"];
const CONFIG_FILENAMES = [
	"tsconfig.json",
	"package.json",
	"eslint.config.js",
	".eslintrc",
	"vite.config.ts",
	"vitest.config.ts",
	"jest.config.js",
	"next.config.js",
	"docker-compose.yml",
	"Dockerfile"
];
const CONFIG_EXTENSIONS = new Set([
	".json",
	".yml",
	".yaml",
	".toml",
	".ini",
	".env"
]);
const DOC_EXTENSIONS = new Set([
	".md",
	".mdx",
	".txt",
	".rst",
	".adoc"
]);
const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".svg",
	".pdf",
	".zip",
	".gz",
	".mp4",
	".mp3"
]);

function getExtension(filename: string): string {
	const dotIndex = filename.lastIndexOf(".");
	return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

function classifyFile(filename: string): ReviewedFileType {
	const normalized = filename.replaceAll("\\", "/");
	const basename = normalized.split("/").at(-1) ?? normalized;
	const extension = getExtension(basename);

	if (LOCKFILE_NAMES.some((name) => normalized.endsWith(name))) {
		return "lockfile";
	}

	if (GENERATED_PATTERNS.some((pattern) => normalized.includes(pattern))) {
		return "generated";
	}

	if (TEST_MARKERS.some((marker) => normalized.includes(marker))) {
		return "test";
	}

	if (CONFIG_FILENAMES.includes(basename) || CONFIG_EXTENSIONS.has(extension)) {
		return "config";
	}

	if (DOC_EXTENSIONS.has(extension)) {
		return "docs";
	}

	if (BINARY_EXTENSIONS.has(extension)) {
		return "binary";
	}

	if (SOURCE_EXTENSIONS.has(extension)) {
		return "source";
	}

	return "unknown";
}

function isReviewableFileType(fileType: ReviewedFileType): boolean {
	return fileType === "source" || fileType === "test" || fileType === "config";
}

function splitPatchIntoSections(patch: string): {
	preamble: string;
	hunks: string[];
} {
	const lines = patch.split("\n");
	const preambleLines: string[] = [];
	const hunks: string[] = [];
	let currentHunk: string[] | undefined;

	for (const line of lines) {
		if (line.startsWith("@@")) {
			if (currentHunk) {
				hunks.push(currentHunk.join("\n"));
			}
			currentHunk = [line];
			continue;
		}

		if (currentHunk) {
			currentHunk.push(line);
			continue;
		}

		preambleLines.push(line);
	}

	if (currentHunk) {
		hunks.push(currentHunk.join("\n"));
	}

	return {
		preamble: preambleLines.join("\n"),
		hunks
	};
}

function truncatePatch(patch: string): string {
	const { preamble, hunks } = splitPatchIntoSections(patch);

	if (!hunks.length) {
		return `${patch.slice(
			0,
			MAX_PATCH_LENGTH
		)}\n\n[TRUNCATED: patch exceeded review size limit and had no detectable hunks]`;
	}

	const sections: string[] = preamble ? [preamble] : [];
	let currentLength = preamble.length;
	let keptHunks = 0;

	for (const hunk of hunks) {
		const separatorLength = sections.length ? 1 : 0;
		const nextLength = currentLength + separatorLength + hunk.length;

		if (keptHunks > 0 && nextLength > MAX_PATCH_LENGTH) {
			break;
		}

		sections.push(hunk);
		currentLength = nextLength;
		keptHunks += 1;

		if (keptHunks === 1 && currentLength > MAX_PATCH_LENGTH) {
			break;
		}
	}

	return `${sections.join("\n")}\n\n[TRUNCATED: kept ${keptHunks}/${hunks.length} complete hunk(s) within review size limit]`;
}

export async function filterFilesNode(
	state: ReviewerState
): Promise<ReviewerStateUpdate> {
	const files = state.files ?? [];
	const filteredFiles: FilteredFile[] = [];
	const skippedFiles: SkippedFile[] = [];

	for (const file of files) {
		const fileType = classifyFile(file.filename);

		if (!file.patch) {
			skippedFiles.push({
				filename: file.filename,
				fileType,
				reason: "missing_patch",
				details: "GitHub did not return a textual patch for this file."
			});
			continue;
		}

		if (fileType === "generated") {
			skippedFiles.push({
				filename: file.filename,
				fileType,
				reason: "generated_file",
				details: "Generated artifact or snapshot file."
			});
			continue;
		}

		if (!isReviewableFileType(fileType)) {
			skippedFiles.push({
				filename: file.filename,
				fileType,
				reason: "unsupported_file_type",
				details: `File classified as ${fileType}.`
			});
			continue;
		}

		filteredFiles.push({
			filename: file.filename,
			patch:
				file.patch.length >= MAX_PATCH_LENGTH
					? truncatePatch(file.patch)
					: file.patch,
			fileType,
			isTruncated: file.patch.length >= MAX_PATCH_LENGTH || undefined,
			originalPatchLength:
				file.patch.length >= MAX_PATCH_LENGTH ? file.patch.length : undefined
		});
	}

	return { filteredFiles, skippedFiles };
}
