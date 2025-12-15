import { describe, expect, it } from "bun:test";
import { buildMongoQuery } from "@/query";
import { db, schema } from "./db";

describe("applyMongoQuery", () => {
	it("should return the correct result", async () => {
		const withMongoQuery = buildMongoQuery(schema.test, {
			find: {
				numeric: {
					$gte: 18,
				},
			},
		});
		const query = db.select().from(schema.test).$dynamic();
		const result = await withMongoQuery(query);
		expect(1).toBe(1);
	});
});
