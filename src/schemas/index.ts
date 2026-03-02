import { z } from "zod";

export const SearchInputSchema = z.object({
  query: z
    .string()
    .min(1, "搜索关键词不能为空")
    .max(200)
    .describe("搜索关键词"),
  type: z
    .enum(["all", "discuss", "problem", "job"])
    .default("all")
    .describe("搜索类型: all(综合), discuss(讨论/面经), problem(题库), job(职位)"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("页码，从1开始"),
}).strict();

export const ListProblemsInputSchema = z.object({
  keyword: z
    .string()
    .max(200)
    .default("")
    .describe("搜索关键词（可选）"),
  difficulty: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(0)
    .describe("难度筛选: 0(全部), 1-5(对应星级)"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("页码，从1开始"),
}).strict();

export const GetProblemInputSchema = z.object({
  problemId: z
    .string()
    .min(1)
    .describe("题目ID，例如 '1001'"),
}).strict();

export const GetProblemSolutionsInputSchema = z.object({
  problemId: z
    .string()
    .min(1)
    .describe("题目ID"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("页码，从1开始"),
}).strict();

export const ListTopicProblemsInputSchema = z.object({
  topicId: z
    .string()
    .min(1)
    .describe("专题ID。常用: 295(面试TOP101), 199(SQL篇), 196(面试高频), 182(笔试大厂真题), 383(算法学习篇)"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("页码，从1开始"),
}).strict();

export const GetDiscussionInputSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe("讨论帖的完整URL或ID。支持格式: 完整URL(https://www.nowcoder.com/discuss/123), discuss ID(123), feed UUID"),
}).strict();

export const BrowseInterviewInputSchema = z.object({
  company: z
    .string()
    .default("")
    .describe("公司名称筛选（可选），例如 '字节跳动', '阿里巴巴'"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("页码，从1开始"),
}).strict();

export type SearchInput = z.infer<typeof SearchInputSchema>;
export type ListProblemsInput = z.infer<typeof ListProblemsInputSchema>;
export type GetProblemInput = z.infer<typeof GetProblemInputSchema>;
export type GetProblemSolutionsInput = z.infer<typeof GetProblemSolutionsInputSchema>;
export type ListTopicProblemsInput = z.infer<typeof ListTopicProblemsInputSchema>;
export type GetDiscussionInput = z.infer<typeof GetDiscussionInputSchema>;
export type BrowseInterviewInput = z.infer<typeof BrowseInterviewInputSchema>;
