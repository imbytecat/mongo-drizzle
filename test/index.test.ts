import { describe, expect, it } from 'bun:test'
import { mongoQueryBuilder } from '#/query'
import { db, schema } from './db'

describe('applyMongoQuery', () => {
  it('should return the correct result', async () => {
    const qb = mongoQueryBuilder(schema.tests, {
      find: {
        numeric: {
          $lte: 18,
        },
      },
      sort: {
        numeric: 1,
      },
    })
    const result = await db.execute(qb)
    console.log(result)
    expect(result).toBeArray()
  })
})
