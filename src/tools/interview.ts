import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BrowseInterviewInputSchema, type BrowseInterviewInput } from "../schemas/index.js";
import { withPage } from "../services/browser.js";
import { waitForContent, extractList, truncateIfNeeded, formatError } from "../services/scraper.js";
import { NOWCODER_BASE_URL } from "../constants.js";
import type { InterviewPost } from "../types.js";

export function registerInterviewTools(server: McpServer): void {
  server.registerTool(
    "nowcoder_browse_interview",
    {
      title: "浏览面经",
      description: `浏览牛客网面试经验，支持按公司名筛选。

Args:
  - company (string): 公司名称（可选），如 "字节跳动", "阿里巴巴", "腾讯"
  - page (number): 页码

Returns:
  面经列表，包含标题、公司、作者、摘要、时间`,
      inputSchema: BrowseInterviewInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: BrowseInterviewInput) => {
      try {
        const results = await withPage(async (page) => {
          if (params.company) {
            // Use search with discuss type filtered by company keyword
            const searchUrl = `${NOWCODER_BASE_URL}/search?type=post&query=${encodeURIComponent(params.company + " 面经")}&page=${params.page}`;
            await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
          } else {
            const interviewUrl = `${NOWCODER_BASE_URL}/interview/center?page=${params.page}`;
            await page.goto(interviewUrl, { waitUntil: "domcontentloaded" });
          }

          await waitForContent(
            page,
            "[class*='common-list'], [class*='discuss-main'], [class*='feed-list'], [class*='interview']",
            10_000
          );
          await page.waitForTimeout(2000);

          return extractList<InterviewPost>(
            page,
            "[class*='common-list'] .clearfix, [class*='discuss-main'], [class*='feed-list'] > div, [class*='list-item'], [class*='interview-item']",
            async (el) => {
              const titleEl = await el.$(
                "a[href*='/discuss/'], a[href*='/feed/'], a[class*='title']"
              );
              const title = titleEl ? (await titleEl.innerText()).trim().slice(0, 100) : "";
              const href = titleEl ? (await titleEl.getAttribute("href")) ?? "" : "";
              const postUrl = href.startsWith("http") ? href : `${NOWCODER_BASE_URL}${href}`;

              const companyEl = await el.$(
                "[class*='company'], [class*='corp']"
              );
              const company = companyEl ? (await companyEl.innerText()).trim() : "";

              const summaryEl = await el.$(
                "[class*='content'], [class*='summary'], [class*='text'], p"
              );
              const summary = summaryEl ? (await summaryEl.innerText()).trim().slice(0, 200) : "";

              const timeEl = await el.$(
                "[class*='time'], [class*='date'], time"
              );
              const time = timeEl ? (await timeEl.innerText()).trim() : "";

              const authorEl = await el.$(
                "[class*='user'], [class*='author'], [class*='name']"
              );
              const author = authorEl ? (await authorEl.innerText()).trim().split("\n")[0]?.trim() ?? "" : "";

              return { title, company, url: postUrl, summary, time, author };
            }
          );
        });

        const validResults = results.filter((r) => r.title && r.url);

        if (validResults.length === 0) {
          const msg = params.company
            ? `未找到 "${params.company}" 的面经。请检查公司名称或尝试其他关键词。`
            : "暂无面经内容。";
          return { content: [{ type: "text", text: msg }] };
        }

        const heading = params.company ? `# ${params.company} 面经` : "# 面经浏览";
        const lines = [`${heading} (第${params.page}页)\n`];
        for (const r of validResults) {
          lines.push(`## ${r.title}`);
          lines.push(`- 链接: ${r.url}`);
          if (r.company) lines.push(`- 公司: ${r.company}`);
          if (r.author) lines.push(`- 作者: ${r.author}`);
          if (r.time) lines.push(`- 时间: ${r.time}`);
          if (r.summary) lines.push(`- 摘要: ${r.summary}`);
          lines.push("");
        }
        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );
}
