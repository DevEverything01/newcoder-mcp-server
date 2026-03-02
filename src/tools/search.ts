import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SearchInputSchema, type SearchInput } from "../schemas/index.js";
import { withPage } from "../services/browser.js";
import { truncateIfNeeded, formatError } from "../services/scraper.js";
import { NOWCODER_BASE_URL } from "../constants.js";
import type { SearchResult } from "../types.js";

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "nowcoder_search",
    {
      title: "搜索牛客网",
      description: `在牛客网上搜索内容，支持按类型筛选。可搜索讨论帖、面经、编程题、职位等。

Args:
  - query (string): 搜索关键词
  - type (string): 搜索类型 - "all"(综合), "discuss"(讨论/面经), "problem"(题库), "job"(职位)
  - page (number): 页码，从1开始

Returns:
  搜索结果列表，包含标题、链接、摘要、作者、时间`,
      inputSchema: SearchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: SearchInput) => {
      try {
        const typeMap: Record<string, string> = {
          all: "all",
          discuss: "post",
          problem: "question",
          job: "job",
        };
        const searchType = typeMap[params.type] ?? "all";
        const url = `${NOWCODER_BASE_URL}/search?type=${searchType}&query=${encodeURIComponent(params.query)}&page=${params.page}`;

        const results = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "networkidle" });
          await page.waitForTimeout(4000);

          // Close login dialog if present
          const closeBtn = await page.$(".el-dialog__headerbtn");
          if (closeBtn) await closeBtn.click().catch(() => {});

          return page.evaluate(() => {
            const items: Array<{
              title: string;
              url: string;
              summary: string;
              author: string;
              time: string;
            }> = [];

            // Find all title links: discuss or feed links with tw-cursor-pointer
            const titleLinks = document.querySelectorAll(
              'a[href*="/discuss/"][class*="tw-cursor-pointer"], a[href*="/feed/main/detail/"][class*="tw-cursor-pointer"]'
            );

            for (const link of titleLinks) {
              const title = (link.textContent || "").trim();
              if (!title) continue;
              const href = (link as HTMLAnchorElement).href || "";

              // Walk up to the feed item container (look for a parent with many children)
              let container = link.parentElement;
              for (let i = 0; i < 8 && container; i++) {
                if (container.children.length >= 3) break;
                container = container.parentElement;
              }
              if (!container) continue;

              // Extract summary from feed-text link
              const feedText = container.querySelector("a.feed-text");
              const summary = feedText
                ? (feedText.textContent || "").trim().slice(0, 200)
                : "";

              // Extract author and time from the container text
              const allText = container.innerText || "";
              const lines = allText.split("\n").map((l: string) => l.trim()).filter((l: string) => l);

              // Author is usually the first non-empty line or user name element
              const authorEl = container.querySelector('a[href*="/users/"]');
              const author = authorEl ? (authorEl.textContent || "").trim() : "";

              // Time: look for date-like patterns
              const timeMatch = allText.match(
                /(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}|\d{2}-\d{2}\s*\d{2}:\d{2}|今天\s*\d{2}:\d{2}|昨天\s*\d{2}:\d{2}|\d+小时前|\d+分钟前)/
              );
              const time = timeMatch ? timeMatch[1] : "";

              items.push({ title: title.slice(0, 100), url: href, summary, author, time });
            }
            return items;
          }) as Promise<SearchResult[]>;
        });

        const seen = new Set<string>();
        const validResults = results.filter((r) => {
          if (!r.title || !r.url || seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });

        if (validResults.length === 0) {
          return {
            content: [{ type: "text", text: `未找到与 "${params.query}" 相关的结果。请尝试其他关键词。` }],
          };
        }

        const lines = [`# 搜索结果: "${params.query}" (${params.type})\n`];
        for (const r of validResults) {
          lines.push(`## ${r.title}`);
          lines.push(`- 链接: ${r.url}`);
          if (r.author) lines.push(`- 作者: ${r.author}`);
          if (r.time) lines.push(`- 时间: ${r.time}`);
          if (r.summary) lines.push(`- 摘要: ${r.summary}`);
          lines.push("");
        }
        const text = truncateIfNeeded(lines.join("\n"));
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return { content: [{ type: "text", text: formatError(error) }] };
      }
    }
  );
}
