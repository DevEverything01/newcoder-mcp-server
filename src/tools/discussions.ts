import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetDiscussionInputSchema, type GetDiscussionInput } from "../schemas/index.js";
import { withPage } from "../services/browser.js";
import { truncateIfNeeded, errorResult } from "../services/scraper.js";
import { NOWCODER_BASE_URL } from "../constants.js";

function resolveDiscussionUrl(input: string): string {
  if (input.startsWith("http")) return input;
  if (input.match(/^[0-9a-f-]{20,}$/i)) {
    return `${NOWCODER_BASE_URL}/feed/main/detail/${input}`;
  }
  if (/^\d+$/.test(input)) {
    return `${NOWCODER_BASE_URL}/discuss/${input}`;
  }
  return `${NOWCODER_BASE_URL}/discuss/${input}`;
}

export function registerDiscussionTools(server: McpServer): void {
  server.registerTool(
    "nowcoder_get_discussion",
    {
      title: "获取讨论帖详情",
      description: `获取牛客网讨论帖或动态的完整内容。

Args:
  - url (string): 帖子的完整URL、discuss ID 或 feed UUID
    例如: "https://www.nowcoder.com/discuss/353154004265934848"
         "353154004265934848"
         "https://www.nowcoder.com/feed/main/detail/xxxx"
  - response_format ("markdown" | "json"): 返回格式，默认 "markdown"

Returns:
  帖子内容，包含标题、作者、时间、正文、标签、链接

Examples:
  - 获取帖子详情 (markdown): { "url": "353154004265934848" }
  - 获取帖子详情 (json): { "url": "353154004265934848", "response_format": "json" }

Error Handling:
  - 页面加载超时时返回超时错误提示
  - 网络连接失败时返回网络错误提示`,
      inputSchema: GetDiscussionInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetDiscussionInput) => {
      try {
        const url = resolveDiscussionUrl(params.url);
        const responseFormat = params.response_format ?? "markdown";

        const detail = await withPage(async (page) => {
          await page.goto(url, { waitUntil: "networkidle" });
          await page.waitForTimeout(3000);

          // Close login dialog if present
          const closeBtn = await page.$(".el-dialog__headerbtn");
          if (closeBtn) await closeBtn.click().catch(() => {});

          return page.evaluate(() => {
            const body = document.body.innerText || "";

            // Title: usually the first major heading or bold text
            const h1 = document.querySelector("h1");
            const titleEl = document.querySelector("[class*='tw-font-bold'][class*='tw-text']");
            const title = h1?.textContent?.trim() || titleEl?.textContent?.trim() || "";

            // Author
            const authorEl = document.querySelector('a[href*="/users/"]');
            const author = authorEl?.textContent?.trim() || "";

            // Time
            const timeMatch = body.match(
              /(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}|\d{2}-\d{2}\s*\d{2}:\d{2})/
            );
            const time = timeMatch ? timeMatch[1] : "";

            // Content: get the main text area
            const contentEl =
              document.querySelector("[class*='nc-post-content']") ||
              document.querySelector("[class*='detail-content']") ||
              document.querySelector("[class*='feed-content']") ||
              document.querySelector("[class*='discuss-main']") ||
              document.querySelector("article");
            const content = (contentEl as HTMLElement | null)?.innerText?.trim() || body.slice(0, 5000);

            // Tags
            const tagEls = document.querySelectorAll("[class*='topic-tag'], [class*='tag-item'] a");
            const tags = Array.from(tagEls).map((t) => t.textContent?.trim() || "").filter(Boolean);

            return { title, author, time, content, tags, commentCount: "0" };
          });
        });

        if (responseFormat === "json") {
          const structured = {
            title: detail.title || "",
            author: detail.author || "",
            time: detail.time || "",
            content: detail.content || "",
            tags: detail.tags,
            url,
          };
          return { content: [{ type: "text", text: truncateIfNeeded(JSON.stringify(structured, null, 2)) }] };
        }

        // Default: markdown format
        const lines: string[] = [];
        if (detail.title) lines.push(`# ${detail.title}\n`);
        if (detail.author) lines.push(`- 作者: ${detail.author}`);
        if (detail.time) lines.push(`- 时间: ${detail.time}`);
        if (detail.tags.length > 0) lines.push(`- 标签: ${detail.tags.join(", ")}`);
        lines.push(`- 链接: ${url}`);
        lines.push("");
        lines.push(detail.content || "(无法提取正文内容)");

        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // --- nowcoder_get_hot_topics ---
  server.registerTool(
    "nowcoder_get_hot_topics",
    {
      title: "获取热门内容",
      description: `获取牛客网当前热门讨论和话题。

Returns:
  热门话题列表，包含标题和链接（最多20条）

Examples:
  - 获取热门内容: 无需参数，直接调用即可

Error Handling:
  - 页面加载超时时返回超时错误提示
  - 网络连接失败时返回网络错误提示
  - 无热门内容时返回空结果提示`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const results = await withPage(async (page) => {
          await page.goto(NOWCODER_BASE_URL, { waitUntil: "networkidle" });
          await page.waitForTimeout(4000);

          // Close login dialog if present
          const closeBtn = await page.$(".el-dialog__headerbtn");
          if (closeBtn) await closeBtn.click().catch(() => {});

          return page.evaluate(() => {
            const items: Array<{ title: string; url: string; summary: string; heat: string }> = [];

            // Find feed item links on the homepage
            const links = document.querySelectorAll(
              'a[href*="/discuss/"], a[href*="/feed/main/detail/"]'
            );
            const seen = new Set<string>();

            for (const link of links) {
              const href = (link as HTMLAnchorElement).href || "";
              if (!href || seen.has(href)) continue;
              const text = (link.textContent || "").trim();
              if (!text || text.length < 4) continue;
              seen.add(href);
              items.push({ title: text.slice(0, 100), url: href, summary: "", heat: "" });
              if (items.length >= 20) break;
            }
            return items;
          });
        });

        if (results.length === 0) {
          return { content: [{ type: "text", text: "暂无热门内容。" }] };
        }

        const lines = ["# 牛客网热门内容\n"];
        for (const item of results) {
          lines.push(`- [${item.title}](${item.url})`);
        }
        return { content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
