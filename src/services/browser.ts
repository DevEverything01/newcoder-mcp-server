import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { VIEWPORT, NAVIGATION_TIMEOUT, ACTION_TIMEOUT, BLOCKED_RESOURCE_TYPES } from "../constants.js";

let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

async function getContext(): Promise<BrowserContext> {
  if (!contextInstance) {
    const browser = await getBrowser();
    contextInstance = await browser.newContext({
      viewport: VIEWPORT,
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    contextInstance.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    contextInstance.setDefaultTimeout(ACTION_TIMEOUT);
  }
  return contextInstance;
}

export async function newPage(): Promise<Page> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  await page.route("**/*", (route) => {
    const resourceType = route.request().resourceType();
    if ((BLOCKED_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  return page;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const page = await newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function shutdown(): Promise<void> {
  if (contextInstance) {
    await contextInstance.close().catch(() => {});
    contextInstance = null;
  }
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}
