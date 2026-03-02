# nowcoder-mcp-server

MCP server for browsing and searching [Nowcoder (牛客网)](https://www.nowcoder.com) content using Playwright headless browser.

## Features

| Tool | Description |
|------|------------|
| `nowcoder_search` | 全站搜索（讨论、题目、职位） |
| `nowcoder_list_problems` | 浏览 ACM/OJ 编程题库 |
| `nowcoder_get_problem` | 获取题目详情 |
| `nowcoder_get_problem_solutions` | 获取题解 |
| `nowcoder_list_topic_problems` | 浏览专题题库（面试TOP101、SQL篇等） |
| `nowcoder_get_discussion` | 获取讨论帖/面经详情 |
| `nowcoder_browse_interview` | 按公司浏览面经 |
| `nowcoder_get_hot_topics` | 获取热门内容 |

## Requirements

- Node.js >= 18
- Chromium (auto-installed via `npx playwright install chromium`)

## Setup

```bash
npm install
npm run build
```

## Cursor Configuration

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "nowcoder": {
      "command": "node",
      "args": ["/path/to/nowcoder-mcp-server/dist/index.js"]
    }
  }
}
```

## Architecture

Uses Playwright to launch a headless Chromium browser, navigate to nowcoder.com pages, and extract structured data from the DOM. Each tool call creates a fresh browser page, extracts content, then closes the page. The browser instance is shared across calls for efficiency.

Key design decisions:
- **Headless Chromium**: Handles JS-rendered dynamic content and anti-scraping measures
- **Resource blocking**: Images, fonts, media, and stylesheets are blocked to speed up page loads
- **Lazy browser init**: Browser only launches on first tool call
- **Graceful shutdown**: Browser is properly closed on SIGINT/SIGTERM
