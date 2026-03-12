import "dotenv/config";
import { errorLabel } from "./cli/console.js";
import { parseArgs } from "./cli/args.js";
import { printReviewResult, printReviewStart, printUsage } from "./cli/output.js";
import { runReview } from "./cli/run-review.js";

async function main() {
	let args: ReturnType<typeof parseArgs>;
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

	printReviewStart(args);
	const result = await runReview(args);
	printReviewResult(args, result);
}

main().catch((error) => {
	console.error(`${errorLabel("[fatal]")} ${String(error)}`);
	process.exit(1);
});
