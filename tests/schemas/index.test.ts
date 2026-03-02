import assert from "node:assert/strict";
import { test } from "node:test";
import { ZodError } from "zod";
import {
  SearchInputSchema,
  ListProblemsInputSchema,
  GetProblemInputSchema,
  GetProblemSolutionsInputSchema,
  ListTopicProblemsInputSchema,
  GetDiscussionInputSchema,
  BrowseInterviewInputSchema,
} from "../../src/schemas/index.js";

function expectZodError(fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => error instanceof ZodError);
}

test("SearchInputSchema should apply defaults and enforce strict mode", () => {
  const parsed = SearchInputSchema.parse({ query: "Java面经" });
  assert.deepEqual(parsed, {
    query: "Java面经",
    type: "all",
    page: 1,
    response_format: "markdown",
  });

  expectZodError(() => SearchInputSchema.parse({ query: "" }));
  expectZodError(() => SearchInputSchema.parse({ query: "ok", extra: true }));
});

test("ListProblemsInputSchema should apply defaults", () => {
  const parsed = ListProblemsInputSchema.parse({});
  assert.deepEqual(parsed, {
    keyword: "",
    difficulty: 0,
    page: 1,
    response_format: "markdown",
  });

  expectZodError(() => ListProblemsInputSchema.parse({ difficulty: 6 }));
});

test("GetProblemInputSchema should validate required field", () => {
  const parsed = GetProblemInputSchema.parse({ problemId: "1001" });
  assert.deepEqual(parsed, {
    problemId: "1001",
    response_format: "markdown",
  });

  expectZodError(() => GetProblemInputSchema.parse({ problemId: "" }));
});

test("GetProblemSolutionsInputSchema should apply page default", () => {
  const parsed = GetProblemSolutionsInputSchema.parse({ problemId: "1001" });
  assert.deepEqual(parsed, {
    problemId: "1001",
    page: 1,
    response_format: "markdown",
  });

  expectZodError(() => GetProblemSolutionsInputSchema.parse({ problemId: "1001", page: 0 }));
});

test("ListTopicProblemsInputSchema should apply defaults", () => {
  const parsed = ListTopicProblemsInputSchema.parse({ topicId: "295" });
  assert.deepEqual(parsed, {
    topicId: "295",
    page: 1,
    response_format: "markdown",
  });

  expectZodError(() => ListTopicProblemsInputSchema.parse({ topicId: "" }));
});

test("GetDiscussionInputSchema should validate url input", () => {
  const parsed = GetDiscussionInputSchema.parse({ url: "353154004265934848" });
  assert.deepEqual(parsed, {
    url: "353154004265934848",
    response_format: "markdown",
  });

  expectZodError(() => GetDiscussionInputSchema.parse({ url: "" }));
});

test("BrowseInterviewInputSchema should apply defaults", () => {
  const parsed = BrowseInterviewInputSchema.parse({});
  assert.deepEqual(parsed, {
    company: "",
    page: 1,
    response_format: "markdown",
  });

  expectZodError(() => BrowseInterviewInputSchema.parse({ page: 0 }));
});
