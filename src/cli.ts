import "dotenv/config";
import { createReviewerGraph } from "./graph/reviewer.graph.js";

async function main() {
	const [owner, repo, pullNumberRaw] = process.argv.slice(2);

	if (!owner || !repo || !pullNumberRaw) {
		console.error("Usage: npm run review -- <owner> <repo> <pullNumber>");
		process.exit(1);
	}

	const pullNumber = Number(pullNumberRaw);

	if (Number.isNaN(pullNumber)) {
		console.error("pullNumber must be a number");
		process.exit(1);
	}

	const graph = createReviewerGraph();

	const result = await graph.invoke({
		owner,
		repo,
		pullNumber
	});

	if (result.errors?.length) {
		console.error("Errors:");
		for (const error of result.errors) {
			console.error(`- ${error}`);
		}
	}

	console.log("\n=== SUMMARY ===\n");
	console.log(result.summary ?? "No summary");

	console.log("\n=== FINDINGS ===\n");
	for (const [index, finding] of (result.findings ?? []).entries()) {
		console.log(
			`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.filename}`
		);
		console.log(
			`   ${finding.title} (${finding.category}, confidence=${finding.confidence})`
		);
		console.log(`   ${finding.explanation}`);
		if (finding.lineHint) {
			console.log(`   Line hint: ${finding.lineHint}`);
		}
		if (finding.suggestion) {
			console.log(`   Suggestion: ${finding.suggestion}`);
		}
		console.log("");
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
