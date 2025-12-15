/**
 * 测试钩子函数使用示例
 *
 * 展示如何在测试中使用 beforeAll, afterAll, beforeEach, afterEach
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'

describe('测试钩子函数示例', () => {
  // ==========================================
  // beforeAll: 在所有测试之前运行一次
  // 用途: 设置共享资源、插入测试数据
  // ==========================================
  beforeAll(async () => {
    console.log('✓ beforeAll: 初始化测试环境')
    // 示例: 插入测试数据
    // await db.insert(schema.tests).values(testData)
  })

  // ==========================================
  // afterAll: 在所有测试之后运行一次
  // 用途: 清理共享资源、删除测试数据
  // ==========================================
  afterAll(async () => {
    console.log('✓ afterAll: 清理测试环境')
    // 示例: 删除测试数据
    // await db.delete(schema.tests)
  })

  // ==========================================
  // beforeEach: 在每个测试之前运行
  // 用途: 为每个测试重置状态、插入独立数据
  // ==========================================
  beforeEach(async () => {
    console.log('  → beforeEach: 准备单个测试')
    // 示例: 为每个测试插入新数据
    // await db.insert(schema.tests).values({ ... })
  })

  // ==========================================
  // afterEach: 在每个测试之后运行
  // 用途: 清理每个测试的数据、重置状态
  // ==========================================
  afterEach(async () => {
    console.log('  ← afterEach: 清理单个测试')
    // 示例: 清理每个测试的数据
    // await db.delete(schema.tests).where(eq(schema.tests.id, testId))
  })

  it('测试 1', () => {
    console.log('    • 运行测试 1')
    expect(true).toBe(true)
  })

  it('测试 2', () => {
    console.log('    • 运行测试 2')
    expect(true).toBe(true)
  })
})

/**
 * 执行顺序:
 *
 * ✓ beforeAll: 初始化测试环境
 *   → beforeEach: 准备单个测试
 *     • 运行测试 1
 *   ← afterEach: 清理单个测试
 *   → beforeEach: 准备单个测试
 *     • 运行测试 2
 *   ← afterEach: 清理单个测试
 * ✓ afterAll: 清理测试环境
 */

/**
 * 最佳实践:
 *
 * 1. **beforeAll + afterAll** - 用于共享资源
 *    - 插入所有测试共用的数据
 *    - 创建数据库连接
 *    - 适用于只读测试数据
 *
 * 2. **beforeEach + afterEach** - 用于独立测试
 *    - 每个测试需要独立的数据
 *    - 测试会修改数据
 *    - 确保测试之间互不影响
 *
 * 3. **混合使用**
 *    - beforeAll: 插入基础数据
 *    - beforeEach: 插入测试特定数据
 *    - afterEach: 清理测试特定数据
 *    - afterAll: 清理所有数据
 */
