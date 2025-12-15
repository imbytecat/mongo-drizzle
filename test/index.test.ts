import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Decimal } from 'decimal.js'
import { mongoQueryBuilder } from '#/index'
import { db, schema } from './db'
import { fixtures } from './fixtures'

describe('mongoQueryBuilder', () => {
  beforeAll(async () => {
    const testData = fixtures.tests.basic()
    await db.insert(schema.tests).values(testData)
  })

  afterAll(async () => {
    await db.delete(schema.tests)
  })
  describe('过滤查询', () => {
    it('应该正确过滤 numeric 字段的 $lte 操作符', async () => {
      const qb = mongoQueryBuilder(schema.tests, {
        find: {
          numeric: {
            $lte: '18',
          },
        },
        sort: {
          numeric: 1,
        },
      })

      const result = await db.execute(qb)

      expect(result).toBeArray()

      // 验证所有结果的 numeric 字段都小于等于 18
      result.forEach((row) => {
        const numericValue = new Decimal(row.numeric)
        expect(numericValue.lte(18)).toBe(true)
      })
    })

    it('应该正确过滤 timestamp 字段的 $lte 操作符', async () => {
      const targetDate = '2025-01-01T00:00:00.000Z'
      const qb = mongoQueryBuilder(schema.tests, {
        find: {
          timestamp: {
            $lte: targetDate,
          },
        },
        sort: {
          numeric: 1,
        },
      })

      const result = await db.execute(qb)

      expect(result).toBeArray()

      // 验证所有结果的 timestamp 都在目标日期之前
      const targetTimestamp = new Date(targetDate).getTime()
      result.forEach((row) => {
        const rowTimestamp = new Date(row.timestamp).getTime()
        expect(rowTimestamp).toBeLessThanOrEqual(targetTimestamp)
      })
    })
  })

  describe('排序功能', () => {
    it('应该按 numeric 字段升序排序', async () => {
      const qb = mongoQueryBuilder(schema.tests, {
        find: {},
        sort: {
          numeric: 1,
        },
      })

      const result = await db.execute(qb)

      expect(result).toBeArray()

      // 验证结果是升序排列的
      for (let i = 0; i < result.length - 1; i++) {
        const current = new Decimal(result[i].numeric)
        const next = new Decimal(result[i + 1].numeric)
        expect(current.lte(next)).toBe(true)
      }
    })
  })
})
