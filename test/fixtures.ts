/**
 * 测试数据 Fixtures
 *
 * 集中管理测试数据,便于复用和维护
 */

/**
 * 测试数据生成器
 */
export const fixtures = {
  /**
   * 创建基础测试数据
   */
  tests: {
    basic: () => [
      {
        text: 'test 1',
        numeric: '5',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        text: 'test 2',
        numeric: '15',
        timestamp: new Date('2024-06-01T00:00:00.000Z'),
      },
      {
        text: 'test 3',
        numeric: '25',
        timestamp: new Date('2025-06-01T00:00:00.000Z'),
      },
    ],

    /**
     * 创建单条测试数据
     */
    single: (
      overrides?: Partial<{
        text: string
        numeric: string
        timestamp: Date
      }>,
    ) => ({
      text: 'test',
      numeric: '10',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    }),

    /**
     * 创建大量测试数据
     */
    bulk: (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        text: `test ${i + 1}`,
        numeric: String(i * 5),
        timestamp: new Date(
          `2024-${String((i % 12) + 1).padStart(2, '0')}-01T00:00:00.000Z`,
        ),
      })),
  },
}

/**
 * 使用示例:
 *
 * ```typescript
 * import { fixtures } from './fixtures'
 *
 * // 基础数据
 * const testData = fixtures.tests.basic()
 * await db.insert(schema.tests).values(testData)
 *
 * // 单条数据,自定义字段
 * const customData = fixtures.tests.single({ numeric: '100' })
 * await db.insert(schema.tests).values(customData)
 *
 * // 批量数据
 * const bulkData = fixtures.tests.bulk(100)
 * await db.insert(schema.tests).values(bulkData)
 * ```
 */
