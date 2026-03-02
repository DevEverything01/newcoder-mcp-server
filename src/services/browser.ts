import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "playwright";
import {
  VIEWPORT,
  NAVIGATION_TIMEOUT,
  ACTION_TIMEOUT,
  BLOCKED_RESOURCE_TYPES,
  USER_AGENTS,
  DELAY_MIN_MS,
  DELAY_MAX_MS,
  MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
} from "../constants.js";

chromium.use(stealth());

let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomDelay(min = DELAY_MIN_MS, max = DELAY_MAX_MS): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((r) => setTimeout(r, ms));
}

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
      userAgent: pickRandom(USER_AGENTS),
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

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("net::err") ||
    msg.includes("navigation failed") ||
    msg.includes("403") ||
    msg.includes("429") ||
    msg.includes("502") ||
    msg.includes("503")
  );
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const page = await newPage();
    try {
      if (attempt > 0) {
        const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await randomDelay(backoff, backoff * 1.5);
      }
      const result = await fn(page);
      await randomDelay();
      return result;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
    } finally {
      await page.close().catch(() => {});
    }
  }

  throw lastError;
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
