export const NOWCODER_BASE_URL = "https://www.nowcoder.com";
export const NOWCODER_AC_URL = "https://ac.nowcoder.com";

export const CHARACTER_LIMIT = 25000;

export const NAVIGATION_TIMEOUT = 30_000;
export const ACTION_TIMEOUT = 10_000;

export const VIEWPORT = { width: 1280, height: 720 };

export const BLOCKED_RESOURCE_TYPES = ["image", "font", "media", "stylesheet"] as const;

export const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0",
] as const;

export const DELAY_MIN_MS = 800;
export const DELAY_MAX_MS = 2500;

export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 2000;
