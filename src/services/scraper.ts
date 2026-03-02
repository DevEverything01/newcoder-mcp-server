import type { Page, ElementHandle } from "playwright";
import { CHARACTER_LIMIT } from "../constants.js";

export async function waitForContent(
  page: Page,
  selector: string,
  timeout = 15_000
): Promise<void> {
  await page.waitForSelector(selector, { state: "attached", timeout }).catch(() => {});
}

export async function extractText(page: Page, selector: string): Promise<string> {
  const el = await page.$(selector);
  if (!el) return "";
  return (await el.innerText()).trim();
}

export async function extractAttribute(
  page: Page,
  selector: string,
  attr: string
): Promise<string> {
  const el = await page.$(selector);
  if (!el) return "";
  return (await el.getAttribute(attr)) ?? "";
}

export async function extractList<T>(
  page: Page,
  itemSelector: string,
  mapper: (el: ElementHandle, index: number) => Promise<T>
): Promise<T[]> {
  const elements = await page.$$(itemSelector);
  const results: T[] = [];
  for (let i = 0; i < elements.length; i++) {
    try {
      results.push(await mapper(elements[i], i));
    } catch {
      // skip malformed items
    }
  }
  return results;
}

export function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return "\n```\n" + decodeHtmlEntities(code.trim()) + "\n```\n";
  });
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => {
    return "\n" + "#".repeat(Number(level)) + " " + text.trim() + "\n";
  });
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<[^>]+>/g, "");
  md = decodeHtmlEntities(md);
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function getPageMainContent(page: Page, contentSelector: string): Promise<string> {
  const html = await page.$eval(contentSelector, (el) => el.innerHTML).catch(() => "");
  if (!html) return "";
  return htmlToMarkdown(html);
}

export function truncateIfNeeded(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n\n...[内容已截断，共 " + text.length + " 字符]";
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Timeout")) {
      return "Error: 页面加载超时。牛客网可能暂时无法访问，请稍后重试。";
    }
    if (error.message.includes("net::ERR_")) {
      return "Error: 网络连接失败。请检查网络后重试。";
    }
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
