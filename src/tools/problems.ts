import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListProblemsInputSchema,
  GetProblemInputSchema,
  GetProblemSolutionsInputSchema,
  ListTopicProblemsInputSchema,
  type ListProblemsInput,
  type GetProblemInput,
  type GetProblemSolutionsInput,
  type ListTopicProblemsInput,
} from "../schemas/index.js";
import { withPage } from "../services/browser.js";
import {
  waitForContent,
  extractList,
  getPageMainContent,
  truncateIfNeeded,
  formatError,
} from "../services/scraper.js";
import { NOWCODER_AC_URL, NOWCODER_BASE_URL } from "../constants.js";
import type { ProblemListItem, ProblemDetail, ProblemSolution, TopicProblem } from "../types.js";

export function registerProblemTools(server: McpServer): void {
  // --- nowcoder_list_problems ---
  server.registerTool(
    "nowcoder_list_problems",
    {
      title: "浏览编程题库",
      description: `列出牛客网 ACM/OJ 编程题目，支持按关键词和难度筛选。

Args:
  - keyword (string): 搜索关键词（可选）
  - difficulty (number): 难度 0(全部) 1-5(星级)
  - page (number): 页码

Returns:
  题目列表，包含 ID、标题、难度、通过率、标签`,
      inputSchema: ListProblemsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListProblemsInput) => {
      try {
        const url = `${NOWCODER_AC_URL}/acm/problem/list?keyword=${encodeURIComponent(params.keyword)}&difficulty=${params.difficulty}&status=all&page=${params.page}`;

        const problems = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await waitForContent(page, "table tbody tr, [class*='problem']", 10_000);
          await page.waitForTimeout(1500);

          return extractList<ProblemListItem>(page, "table tbody tr", async (el) => {
            const cells = await el.$$("td");
            if (cells.length < 4) throw new Error("skip");

            const id = (await cells[0].innerText()).trim();
            const titleEl = await cells[1].$("a");
            const title = titleEl ? (await titleEl.innerText()).trim() : (await cells[1].innerText()).trim();
            const difficulty = (await cells[2].innerText()).trim();
            const acceptRate = (await cells[3].innerText()).trim();

            const tagEls = await el.$$("[class*='tag']");
            const tags: string[] = [];
            for (const t of tagEls) {
              const txt = (await t.innerText()).trim();
              if (txt) tags.push(txt);
            }

            return { id, title, difficulty, acceptRate, tags };
          });
        });

        if (problems.length === 0) {
          return { content: [{ type: "text", text: "未找到题目。请调整筛选条件后重试。" }] };
        }

        const lines = [`# 编程题库 (第${params.page}页)\n`];
        if (params.keyword) lines.push(`关键词: ${params.keyword}\n`);
        lines.push("| ID | 标题 | 难度 | 通过率 | 标签 |");
        lines.push("|---|---|---|---|---|");
        for (const p of problems) {
          lines.push(`| ${p.id} | ${p.title} | ${p.difficulty} | ${p.acceptRate} | ${p.tags.join(", ")} |`);
        }
        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );

  // --- nowcoder_get_problem ---
  server.registerTool(
    "nowcoder_get_problem",
    {
      title: "获取题目详情",
      description: `获取牛客网特定编程题目的完整描述，包括题面、输入输出格式、示例和限制。

Args:
  - problemId (string): 题目ID

Returns:
  Markdown 格式的题目详情`,
      inputSchema: GetProblemInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetProblemInput) => {
      try {
        const url = `${NOWCODER_AC_URL}/acm/problem/${params.problemId}`;

        const detail = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await waitForContent(page, "[class*='question-main'], [class*='problem-content'], .terminal-topic-content", 10_000);
          await page.waitForTimeout(1500);

          const title = await page.$eval(
            "h1, [class*='problem-title'], [class*='question-title']",
            (el) => el.textContent?.trim() ?? ""
          ).catch(() => `Problem ${params.problemId}`);

          const limitsText = await page.$eval(
            "[class*='question-info'], [class*='problem-info'], [class*='limit']",
            (el) => el.textContent?.trim() ?? ""
          ).catch(() => "");

          const timeLimit = limitsText.match(/时间限制[：:]\s*(\S+)/)?.[1] ?? "";
          const memoryLimit = limitsText.match(/(?:空间|内存)限制[：:]\s*(\S+)/)?.[1] ?? "";

          const mainContent = await getPageMainContent(
            page,
            "[class*='question-main'], [class*='problem-content'], .terminal-topic-content, [class*='subject-describe']"
          );

          return {
            id: params.problemId,
            title,
            difficulty: "",
            timeLimit,
            memoryLimit,
            description: mainContent,
            inputFormat: "",
            outputFormat: "",
            examples: "",
          } satisfies ProblemDetail;
        });

        const lines = [`# ${detail.title}\n`];
        lines.push(`- 题目ID: ${detail.id}`);
        if (detail.timeLimit) lines.push(`- 时间限制: ${detail.timeLimit}`);
        if (detail.memoryLimit) lines.push(`- 内存限制: ${detail.memoryLimit}`);
        lines.push("");
        lines.push(detail.description);

        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );

  // --- nowcoder_get_problem_solutions ---
  server.registerTool(
    "nowcoder_get_problem_solutions",
    {
      title: "获取题解",
      description: `获取牛客网特定题目的社区题解列表。

Args:
  - problemId (string): 题目ID
  - page (number): 页码

Returns:
  题解列表，包含作者、标题、摘要、点赞数`,
      inputSchema: GetProblemSolutionsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetProblemSolutionsInput) => {
      try {
        const url = `${NOWCODER_AC_URL}/acm/problem/blogs/${params.problemId}?page=${params.page}`;

        const solutions = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await waitForContent(page, "[class*='blog-list'], [class*='discuss'], .list-item, .blog-item", 10_000);
          await page.waitForTimeout(1500);

          return extractList<ProblemSolution>(
            page,
            "[class*='blog-list'] > div, .list-item, .blog-item, [class*='discuss-item']",
            async (el) => {
              const titleEl = await el.$("a[class*='title'], a[href*='blog']");
              const title = titleEl ? (await titleEl.innerText()).trim() : "";
              const href = titleEl ? (await titleEl.getAttribute("href")) ?? "" : "";
              const solutionUrl = href.startsWith("http") ? href : `${NOWCODER_AC_URL}${href}`;

              const authorEl = await el.$("[class*='author'], [class*='user'], [class*='name']");
              const author = authorEl ? (await authorEl.innerText()).trim() : "";

              const summaryEl = await el.$("[class*='content'], [class*='summary'], p");
              const summary = summaryEl ? (await summaryEl.innerText()).trim().slice(0, 200) : "";

              const likesEl = await el.$("[class*='like'], [class*='praise']");
              const likes = likesEl ? (await likesEl.innerText()).trim() : "0";

              return { author, title, summary, likes, url: solutionUrl };
            }
          );
        });

        if (solutions.length === 0) {
          return { content: [{ type: "text", text: "该题目暂无题解。" }] };
        }

        const lines = [`# 题目 ${params.problemId} 的题解 (第${params.page}页)\n`];
        for (const s of solutions) {
          lines.push(`## ${s.title || "(无标题)"}`);
          lines.push(`- 作者: ${s.author}`);
          lines.push(`- 点赞: ${s.likes}`);
          if (s.url) lines.push(`- 链接: ${s.url}`);
          if (s.summary) lines.push(`- 摘要: ${s.summary}`);
          lines.push("");
        }
        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );

  // --- nowcoder_list_topic_problems ---
  server.registerTool(
    "nowcoder_list_topic_problems",
    {
      title: "浏览专题题库",
      description: `获取牛客网特定专题（如面试TOP101、SQL篇）的题目列表。

常用 topicId:
  - 295: 面试TOP101
  - 199: SQL篇
  - 196: 面试高频题目
  - 182: 笔试大厂真题
  - 383: 算法学习篇
  - 389: 笔试模板必刷
  - 372: 输入输出练习
  - 260: 前端篇
  - 301: Verilog篇
  - 195: SHELL篇

Args:
  - topicId (string): 专题ID
  - page (number): 页码

Returns:
  专题题目列表，包含编号、标题、难度、通过率`,
      inputSchema: ListTopicProblemsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: ListTopicProblemsInput) => {
      try {
        const url = `${NOWCODER_BASE_URL}/exam/oj/ta?tpId=${params.topicId}&page=${params.page}`;

        const result = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await waitForContent(page, "[class*='question-item'], [class*='td-left'], a[href*='/practice/']", 10_000);
          await page.waitForTimeout(2000);

          const topicTitle = await page.$eval(
            "[class*='topic-title'], h1, [class*='paper-title']",
            (el) => el.textContent?.trim() ?? ""
          ).catch(() => `专题 ${params.topicId}`);

          const problems = await page.$$eval(
            "[class*='question-item'], [class*='td-left'], tr:has(a[href*='/practice/'])",
            (rows) =>
              rows.map((row, i) => {
                const link = row.querySelector("a[href*='/practice/']") as HTMLAnchorElement | null;
                const title = link?.textContent?.trim() ?? "";
                const href = link?.href ?? "";
                const tds = row.querySelectorAll("td, [class*='td']");
                const difficulty = tds.length > 1 ? (tds[1] as HTMLElement)?.textContent?.trim() ?? "" : "";
                const acceptRate = tds.length > 2 ? (tds[2] as HTMLElement)?.textContent?.trim() ?? "" : "";
                return {
                  index: String(i + 1),
                  title,
                  difficulty,
                  acceptRate,
                  url: href,
                };
              })
          );

          return { topicTitle, problems: problems as TopicProblem[] };
        });

        if (result.problems.length === 0) {
          // Fallback: try to get problems from the list with different selectors
          const fallbackResult = await withPage(async (page) => {
            await page.goto(url, { waitUntil: "networkidle" });
            await page.waitForTimeout(3000);

            const items = await page.$$eval("a[href*='/practice/']", (links) =>
              links.map((a, i) => ({
                index: String(i + 1),
                title: a.textContent?.trim() ?? "",
                difficulty: "",
                acceptRate: "",
                url: (a as HTMLAnchorElement).href,
              }))
            );
            return items as TopicProblem[];
          });

          if (fallbackResult.length === 0) {
            return { content: [{ type: "text", text: "该专题暂无题目或专题ID无效。" }] };
          }
          result.problems = fallbackResult;
        }

        const lines = [`# ${result.topicTitle}\n`];
        lines.push("| # | 标题 | 难度 | 通过率 |");
        lines.push("|---|---|---|---|");
        for (const p of result.problems) {
          lines.push(`| ${p.index} | [${p.title}](${p.url}) | ${p.difficulty} | ${p.acceptRate} |`);
        }

        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );
}
