# AI Code Reviewer

A CLI tool for automated GitHub Pull Request review powered by an LLM.

The project fetches PR data from the GitHub API, runs changed files through a LangGraph-based review pipeline, and produces a concise summary plus structured findings for meaningful engineering issues in the diff.

## What It Does

- Fetches Pull Request metadata
- Fetches all changed PR files with pagination
- Classifies files by type
- Filters out files that are not suitable for review
- Analyzes diffs with an LLM using structured output
- Returns a summary and a list of findings with severity, category, confidence, and line hints

## Pipeline

The graph is defined in [src/graph/reviewer.graph.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/reviewer.graph.ts) and consists of four steps:

1. `fetchPR`
   Fetches PR metadata and the full list of changed files from GitHub.
2. `filterFiles`
   Classifies files, selects reviewable patch-based files, and records skipped files with explicit reasons.
3. `analyze`
   Sends each selected file to the LLM and collects structured findings. Failures are handled per file, so one bad response does not fail the entire run.
4. `finalize`
   Builds the final summary, including findings counts and skipped file counts.

## Project Structure

- [src/cli.ts](c:/ForMe/Learning/ai-code-reviewer/src/cli.ts) - CLI entry point
- [src/graph/state.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/state.ts) - shared graph state and review-related types
- [src/graph/reviewer.graph.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/reviewer.graph.ts) - LangGraph pipeline definition
- [src/graph/nodes/fetch-pr.node.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/nodes/fetch-pr.node.ts) - PR and file retrieval
- [src/graph/nodes/filter-files.node.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/nodes/filter-files.node.ts) - file classification and filtering
- [src/graph/nodes/analyze.node.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/nodes/analyze.node.ts) - per-file LLM analysis
- [src/graph/nodes/finalize.node.ts](c:/ForMe/Learning/ai-code-reviewer/src/graph/nodes/finalize.node.ts) - final summary assembly
- [src/github/](c:/ForMe/Learning/ai-code-reviewer/src/github) - GitHub API access
- [src/prompts/review.ts](c:/ForMe/Learning/ai-code-reviewer/src/prompts/review.ts) - review prompt construction
- [src/schemas/review.schema.ts](c:/ForMe/Learning/ai-code-reviewer/src/schemas/review.schema.ts) - structured output schema

## Requirements

- Node.js 20+
- `GITHUB_TOKEN` for GitHub API access
- `OPENAI_API_KEY` for model access

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file or export these variables:

```env
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
```

## Usage

```bash
npm run review -- <owner> <repo> <pullNumber>
```

Example:

```bash
npm run review -- vercel next.js 12345
```

## Example CLI Output

```text
=== SUMMARY ===

Review completed. Findings: high=1, medium=1, low=0. Skipped files: 2.

- src/api/user.ts: The new null handling branch still dereferences profile.id before checking whether profile exists.
- src/config/app.config.ts: Configuration parsing is mostly safe, but missing validation for REVIEW_TIMEOUT_MS can lead to NaN values at runtime.
- package-lock.json: skipped (unsupported_file_type, File classified as lockfile.)
- dist/generated-client.js: skipped (generated_file, Generated artifact or snapshot file.)

=== FINDINGS ===

1. [HIGH] src/api/user.ts
   Null check happens after property access (correctness, confidence=high)
   The patch reads profile.id before guarding against profile being undefined, which can throw at runtime for users without a profile.
   Line hint: @@ -48,7 +48,9 @@
   Suggestion: Move the null/undefined guard before the property access and return early when profile is absent.

2. [MEDIUM] src/config/app.config.ts
   REVIEW_TIMEOUT_MS is parsed without validation (error-handling, confidence=medium)
   Number(process.env.REVIEW_TIMEOUT_MS) can produce NaN, and the current patch does not validate that before using it in timeout logic.
   Line hint: added env parsing block
   Suggestion: Validate the parsed value and fall back to a safe default if it is missing or invalid.
```

## Output Format

The CLI prints:

- `SUMMARY` - the overall review result, including skipped files and per-file notes
- `FINDINGS` - the list of detected issues

Each finding contains:

- `severity`: `high | medium | low`
- `category`: `correctness | security | performance | type-safety | error-handling | maintainability`
- `confidence`: `high | medium | low`
- `title`
- `explanation`
- `lineHint` - a short pointer to the relevant line or diff hunk when available
- `suggestion` - optional remediation guidance
