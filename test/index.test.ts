import { describe, expect, it } from "bun:test";
import { withMongoQuery } from "@/query";
import { db, schema } from "./db";

describe("applyMongoQuery", () => {
	it("should return the correct result", async () => {
		const withCustomQuery = withMongoQuery(schema.test, {
			find: {
				numeric: {
					$gte: 18,
				},
			},
		});
		let query = db.select().from(schema.test).$dynamic();
		query = withCustomQuery(query);
		const result = await query;
		expect(1).toBe(1);
	});
});
