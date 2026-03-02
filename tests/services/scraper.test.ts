import assert from "node:assert/strict";
import { test } from "node:test";
import {
  waitForContent,
  extractText,
  extractAttribute,
  extractList,
  htmlToMarkdown,
  getPageMainContent,
  truncateIfNeeded,
  formatError,
  errorResult,
} from "../../src/services/scraper.js";

test("waitForContent should swallow selector timeout error", async () => {
  const page = {
    waitForSelector: async () => {
      throw new Error("timeout");
    },
  } as any;

  await assert.doesNotReject(waitForContent(page, ".target", 1));
});

test("extractText should return trimmed text and empty string when element missing", async () => {
  const pageWithElement = {
    $: async () => ({
      innerText: async () => "  hello world  ",
    }),
  } as any;

  const pageWithoutElement = {
    $: async () => null,
  } as any;

  assert.equal(await extractText(pageWithElement, ".title"), "hello world");
  assert.equal(await extractText(pageWithoutElement, ".title"), "");
});

test("extractAttribute should return attribute value and fallback to empty string", async () => {
  const pageWithAttr = {
    $: async () => ({
      getAttribute: async () => "/detail/1",
    }),
  } as any;

  const pageWithoutAttr = {
    $: async () => ({
      getAttribute: async () => null,
    }),
  } as any;

  assert.equal(await extractAttribute(pageWithAttr, "a", "href"), "/detail/1");
  assert.equal(await extractAttribute(pageWithoutAttr, "a", "href"), "");
});

test("extractList should skip malformed items", async () => {
  const page = {
    $$: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
  } as any;

  const result = await extractList<number>(page, ".row", async (_el, index) => {
    if (index === 1) {
      throw new Error("bad row");
    }
    return index;
  });

  assert.deepEqual(result, [0, 2]);
});

test("htmlToMarkdown should convert rich html to markdown", () => {
  const html = [
    "<h2>标题</h2>",
    "<p>Hello <strong>World</strong> &amp; <em>You</em></p>",
    "<pre><code>const flag = a &amp;&amp; b;</code></pre>",
    "<ul><li>item1</li><li>item2</li></ul>",
    '<a href="https://example.com">Link</a>',
  ].join("");

  const markdown = htmlToMarkdown(html);

  assert.match(markdown, /## 标题/);
  assert.match(markdown, /\*\*World\*\*/);
  assert.match(markdown, /\*You\*/);
  assert.match(markdown, /```[\s\S]*const flag = a && b;/);
  assert.match(markdown, /- item1/);
  assert.match(markdown, /- item2/);
  assert.match(markdown, /\[Link\]\(https:\/\/example\.com\)/);
});

test("getPageMainContent should convert html to markdown and handle selector miss", async () => {
  const pageWithContent = {
    $eval: async () => "<p>line1</p><p>line2</p>",
  } as any;

  const pageWithoutContent = {
    $eval: async () => {
      throw new Error("not found");
    },
  } as any;

  assert.equal(await getPageMainContent(pageWithContent, ".content"), "line1\n\nline2");
  assert.equal(await getPageMainContent(pageWithoutContent, ".content"), "");
});

test("truncateIfNeeded should keep short text and trim long text with marker", () => {
  assert.equal(truncateIfNeeded("short", 10), "short");

  const truncated = truncateIfNeeded("abcdefgh", 3);
  assert.ok(truncated.startsWith("abc"));
  assert.match(truncated, /内容已截断，共 8 字符/);
});

test("formatError and errorResult should generate user-friendly error payload", () => {
  assert.equal(
    formatError(new Error("Timeout exceeded")),
    "Error: 页面加载超时。牛客网可能暂时无法访问，请稍后重试。"
  );
  assert.equal(
    formatError(new Error("net::ERR_CONNECTION_RESET")),
    "Error: 网络连接失败。请检查网络后重试。"
  );
  assert.equal(formatError(new Error("Other reason")), "Error: Other reason");
  assert.equal(formatError("unknown"), "Error: unknown");

  const result = errorResult(new Error("Boom"));
  assert.equal(result.isError, true);
  assert.equal(result.content[0].type, "text");
  assert.equal(result.content[0].text, "Error: Boom");
});
