import { allParsingInstructions, MongoQueryParser } from '@ucast/mongo'

/**
 * MongoDB 查询解析器
 */
export const MONGO_QUERY_PARSER = new MongoQueryParser(allParsingInstructions)

/**
 * 排序方向常量
 */
export const SORT_DIRECTION = {
  ASC: 1,
  DESC: -1,
} as const
