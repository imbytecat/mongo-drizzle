import { z } from "zod";

export const queryRequestSchema = z.strictObject({
	find: z.record(z.string(), z.any()).default({}),
	sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
	skip: z.number().int().nonnegative().default(0).optional(),
	limit: z.number().int().positive().default(50).optional(),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;
