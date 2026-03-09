import { StateGraph, START, END } from "@langchain/langgraph";
import { reviewerStateAnnotation } from "./state.js";
import { fetchPrNode } from "./nodes/fetch-pr.node.js";
import { filterFilesNode } from "./nodes/filter-files.node.js";
import { analyzeNode } from "./nodes/analyze.node.js";
import { finalizeNode } from "./nodes/finalize.node.js";

export function createReviewerGraph() {
	return new StateGraph(reviewerStateAnnotation)
		.addNode("fetchPR", fetchPrNode)
		.addNode("filterFiles", filterFilesNode)
		.addNode("analyze", analyzeNode)
		.addNode("finalize", finalizeNode)
		.addEdge(START, "fetchPR")
		.addEdge("fetchPR", "filterFiles")
		.addEdge("filterFiles", "analyze")
		.addEdge("analyze", "finalize")
		.addEdge("finalize", END)
		.compile();
}
