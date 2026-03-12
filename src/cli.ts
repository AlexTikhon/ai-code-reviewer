import "dotenv/config";
import { createReviewerGraph } from "./graph/reviewer.graph.js";
import {
	consoleStyles,
	errorLabel,
	progressLabel,
	sectionTitle,
	severityBadge
} from "./utils/console.js";
import type { ReviewerFinding, ReviewerState } from "./graph/state.js";

type CliArgs =
	| {
			reviewMode: "pr";
			owner: string;
			repo: string;
			pullNumber: number;
	  }
	| {
			reviewMode: "local";
			localBaseRef?: string;
			localRepoPath?: string;
	  };

function printUsage() {
	console.error(sectionTitle("Usage"));
	console.error(
		`  ${consoleStyles.dim("npm run review -- <owner> <repo> <pullNumber>")}`
	);
	console.error(
		`  ${consoleStyles.dim(
			"npm run review -- --local [--base <ref>] [--repo <path>]"
		)}`
	);
}

function parseArgs(argv: string[]): CliArgs {
	if (argv.includes("--local")) {
		const baseIndex = argv.indexOf("--base");
		const repoIndex = argv.indexOf("--repo");
		const localBaseRef = baseIndex >= 0 ? argv[baseIndex + 1] : undefined;
		const localRepoPath = repoIndex >= 0 ? argv[repoIndex + 1] : undefined;

		if (baseIndex >= 0 && !localBaseRef) {
			throw new Error("--base requires a ref value");
		}

		if (repoIndex >= 0 && !localRepoPath) {
			throw new Error("--repo requires a path value");
		}

		return {
			reviewMode: "local",
			localBaseRef,
			localRepoPath
		};
	}

	const [owner, repo, pullNumberRaw] = argv;

	if (!owner || !repo || !pullNumberRaw) {
		throw new Error("Missing required PR arguments");
	}

	const pullNumber = Number(pullNumberRaw);

	if (Number.isNaN(pullNumber)) {
		throw new Error("pullNumber must be a number");
	}

	return {
		reviewMode: "pr",
		owner,
		repo,
		pullNumber
	};
}

function mergeStateUpdate(
	current: Partial<ReviewerState>,
	update: Partial<ReviewerState>
): Partial<ReviewerState> {
	return {
		...current,
		...update,
		errors: update.errors ?? current.errors,
		findings: update.findings ?? current.findings,
		filteredFiles: update.filteredFiles ?? current.filteredFiles,
		files: update.files ?? current.files,
		skippedFiles: update.skippedFiles ?? current.skippedFiles,
		summary: update.summary ?? current.summary
	};
}

function printFinding(finding: ReviewerFinding, index: number) {
	console.log(
		`${consoleStyles.bold(`${index}.`)} [${severityBadge(
			finding.severity
		)}] ${consoleStyles.bold(finding.filename)}`
	);
	console.log(
		`   ${finding.title} ${consoleStyles.dim(
			`(${finding.category}, confidence=${finding.confidence})`
		)}`
	);
	console.log(`   ${finding.explanation}`);
	if (finding.lineHint) {
		console.log(
			`   ${consoleStyles.magenta("Line hint:")} ${finding.lineHint}`
		);
	}
	if (finding.suggestion) {
		console.log(
			`   ${consoleStyles.green("Suggestion:")} ${finding.suggestion}`
		);
	}
	console.log("");
}

async function main() {
	let args: CliArgs;
	try {
		args = parseArgs(process.argv.slice(2));
	} catch (error) {
		console.error(
			`${errorLabel("[error]")} ${
				error instanceof Error ? error.message : "Invalid arguments"
			}`
		);
		printUsage();
		process.exit(1);
	}

	const graph = createReviewerGraph();

	if (args.reviewMode === "local") {
		console.log(
			args.localBaseRef
				? `${progressLabel("[review]")} Starting local diff review against ${consoleStyles.bold(args.localBaseRef)}...`
				: `${progressLabel("[review]")} Starting local diff review against ${consoleStyles.bold("HEAD")}...`
		);
		if (args.localRepoPath) {
			console.log(
				`${progressLabel("[review]")} Repository path: ${consoleStyles.bold(args.localRepoPath)}`
			);
		}
	} else {
		console.log(
			`${progressLabel("[review]")} Starting PR review for ${consoleStyles.bold(
				`${args.owner}/${args.repo}#${args.pullNumber}`
			)}...`
		);
	}

	let result: Partial<ReviewerState> = {};
	const stream = await graph.stream(args, { streamMode: "updates" });

	for await (const chunk of stream) {
		for (const nodeUpdate of Object.values(
			chunk as Record<string, Partial<ReviewerState>>
		)) {
			result = mergeStateUpdate(result, nodeUpdate);
		}
	}

	if (result.errors?.length) {
		console.error(`\n${sectionTitle("Errors")}\n`);
		for (const error of result.errors) {
			console.error(`${errorLabel("*")} ${error}`);
		}
	}

	console.log(`\n${sectionTitle("=== SUMMARY ===")}\n`);
	console.log(result.summary ?? "No summary");

	if (args.reviewMode === "local") {
		console.log(`\n${sectionTitle("=== REVIEW TARGET ===")}\n`);
		console.log(
			args.localBaseRef
				? `Local git diff against ${consoleStyles.bold(args.localBaseRef)}`
				: `Local git diff against ${consoleStyles.bold("HEAD")}`
		);
		if (args.localRepoPath) {
			console.log(`Repository: ${consoleStyles.bold(args.localRepoPath)}`);
		}
	} else {
		console.log(`\n${sectionTitle("=== REVIEW TARGET ===")}\n`);
		console.log(
			consoleStyles.bold(`${args.owner}/${args.repo}#${args.pullNumber}`)
		);
	}

	console.log(`\n${sectionTitle("=== FINDINGS ===")}\n`);
	for (const [index, finding] of (result.findings ?? []).entries()) {
		printFinding(finding, index + 1);
	}
}

main().catch((error) => {
	console.error(`${errorLabel("[fatal]")} ${String(error)}`);
	process.exit(1);
});
