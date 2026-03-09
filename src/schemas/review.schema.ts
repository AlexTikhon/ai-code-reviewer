import { z } from "zod";

export const findingSchema = z.object({
	severity: z.enum(["high", "medium", "low"]),
	title: z.string(),
	explanation: z.string(),
	suggestion: z.string().optional()
});

export const reviewResponseSchema = z.object({
	findings: z.array(findingSchema),
	summary: z.string()
});

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
