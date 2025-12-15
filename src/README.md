# mongo-drizzle 源代码结构

这个库采用模块化设计,便于维护和扩展。

## 📁 目录结构

```
src/
├── index.ts              # 公共 API 入口
├── query.ts              # (已弃用) 向后兼容的重新导出
├── schema.ts             # QueryRequest 类型定义
├── types.ts              # 核心类型定义
├── constants.ts          # 常量定义
│
├── utils/                # 工具函数模块
│   ├── index.ts          # 工具函数入口
│   ├── date.ts           # 日期处理工具
│   ├── zod.ts            # Zod schema 工具
│   └── sql.ts            # SQL 辅助工具
│
├── operators/            # 操作符模块
│   ├── index.ts          # 操作符入口
│   ├── comparison.ts     # 比较操作符 (eq, gt, lte, in, etc.)
│   └── logical.ts        # 逻辑操作符 (and, or, not, nor)
│
└── core/                 # 核心逻辑模块
    ├── index.ts          # 核心逻辑入口
    ├── cache.ts          # 表元数据缓存
    ├── converter.ts      # MongoDB AST → Drizzle SQL 转换器
    └── builder.ts        # 查询构建器

```

## 🎯 模块职责

### 公共 API (`index.ts`)
- 导出核心函数: `mongoQueryBuilder`, `withMongoQuery`
- 导出类型定义
- 导出常用工具函数

### 类型定义 (`types.ts`)
- `ComparisonOperator`: 比较操作符类型
- `LogicalOperator`: 逻辑操作符类型
- `QueryContext`: 查询上下文
- `TableMetadata`: 表元数据

### 常量 (`constants.ts`)
- `MONGO_QUERY_PARSER`: MongoDB 查询解析器实例
- `SORT_DIRECTION`: 排序方向常量

### 工具模块 (`utils/`)

#### `date.ts` - 日期处理
- `parseValidDateString`: 使用 dayjs 解析并验证日期字符串

#### `zod.ts` - Zod schema 工具
- `hasZodProperty`: 类型守卫,检查对象是否有 _zod 属性
- `isZodSchema`: 类型守卫,检查是否是 Zod schema
- `getInnerSchema`: 获取包装类型的内部 schema
- `isDateSchema`: 检查 schema 是否是日期类型
- `preprocessValue`: 预处理值(日期字符串转换)
- `parseAndValidateValue`: 解析并验证值

#### `sql.ts` - SQL 辅助工具
- `filterDefinedSQL`: 过滤 undefined 的 SQL 片段
- `createArrayFilterSQL`: 创建数组过滤 SQL

### 操作符模块 (`operators/`)

#### `comparison.ts` - 比较操作符
- `COMPARISON_OPERATORS`: 比较操作符映射
  - `eq`, `gt`, `gte`, `lt`, `lte`, `ne`
  - `in`, `nin` (数组操作符)

#### `logical.ts` - 逻辑操作符
- `LOGICAL_OPERATORS`: 逻辑操作符映射
  - `and`, `or`, `not`, `nor`

### 核心模块 (`core/`)

#### `cache.ts` - 缓存层
- `getTableMetadata`: 获取或创建表元数据(使用 WeakMap 缓存)

#### `converter.ts` - 转换器
- `convertConditionToSQL`: 将 MongoDB AST 转换为 Drizzle SQL
- `processFieldCondition`: 处理字段条件
- `processCompoundCondition`: 处理复合条件

#### `builder.ts` - 查询构建器
- `buildOrderByClause`: 构建排序子句
- `withMongoQuery`: 应用 MongoDB 查询到 Drizzle 查询构建器
- `mongoQueryBuilder`: MongoDB 风格的查询构建器

## 🔧 使用示例

```typescript
// 从包根导入
import { mongoQueryBuilder } from 'mongo-drizzle'

// 或者从特定模块导入
import { mongoQueryBuilder } from 'mongo-drizzle/core'
import { isDateSchema } from 'mongo-drizzle/utils'
```

## 🏗️ 设计原则

1. **单一职责**: 每个模块只负责一个明确的功能
2. **关注点分离**: 工具、操作符、核心逻辑分离
3. **可测试性**: 小函数易于单元测试
4. **可扩展性**: 添加新操作符或功能无需修改核心逻辑
5. **类型安全**: 完整的 TypeScript 类型支持
6. **性能优化**: 使用 WeakMap 缓存,避免重复计算

## 📦 构建输出

构建后会生成:
- ES Module (`.mjs`)
- CommonJS (`.cjs`)
- TypeScript 类型定义 (`.d.ts`)
