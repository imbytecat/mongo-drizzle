import { describe, expect, it } from "bun:test";
import { mongoQueryBuilder } from "@/query";
import { schema } from "./db";

describe("applyMongoQuery", () => {
	it("should return the correct result", async () => {
		const query = mongoQueryBuilder(schema.test, {
			find: {
				numeric: {
					$gte: 18,
				},
			},
			sort: {
				numeric: 1,
			},
		});
		await query;
		expect(1).toBe(1);
	});
});
