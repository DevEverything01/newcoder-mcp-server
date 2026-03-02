# 🐮 Nowcoder MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-brightgreen)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/Node.js-≥18-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

让 AI 直接访问[牛客网](https://www.nowcoder.com)——搜索题目、浏览面经、获取题解，一切通过 [Model Context Protocol](https://modelcontextprotocol.io)。

<p align="center">
  <img src="https://www.nowcoder.com/favicon.ico" width="48" alt="Nowcoder" />
  &nbsp;&nbsp;⟷&nbsp;&nbsp;
  <strong>MCP</strong>
  &nbsp;&nbsp;⟷&nbsp;&nbsp;
  🤖 AI
</p>

---

## ✨ 功能一览

| 工具 | 描述 |
|------|------|
| `nowcoder_search` | 全站搜索（讨论、题目、职位） |
| `nowcoder_list_problems` | 浏览 ACM/OJ 题库，支持难度筛选 |
| `nowcoder_get_problem` | 获取题目完整描述、示例、限制 |
| `nowcoder_get_problem_solutions` | 获取社区题解列表 |
| `nowcoder_list_topic_problems` | 浏览专题题库（面试 TOP101、SQL 篇等） |
| `nowcoder_get_discussion` | 获取讨论帖 / 动态的完整内容 |
| `nowcoder_get_hot_topics` | 获取首页热门讨论 |
| `nowcoder_browse_interview` | 浏览面经，支持按公司筛选 |

## 🚀 快速开始

### 前置条件

- Node.js ≥ 18
- 系统已安装 Chromium 依赖（用于 Playwright）

### 安装

```bash
git clone https://github.com/yourname/nowcoder-mcp-server.git
cd nowcoder-mcp-server
npm install
npm run build
```

> `postinstall` 脚本会自动下载 Playwright Chromium。

### 运行

**Stdio 模式**（默认，用于 Claude Desktop / Cursor 等本地客户端）：

```bash
npm start
```

**HTTP 模式**（用于远程部署）：

```bash
npm run start:http
# 默认监听 http://0.0.0.0:3000/mcp
```

## 🔌 接入你的 AI 工具

### Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

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

### Cursor

编辑 `.cursor/mcp.json`：

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

### VS Code (GitHub Copilot)

编辑 `.vscode/mcp.json`：

```json
{
  "servers": {
    "nowcoder": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/nowcoder-mcp-server/dist/index.js"]
    }
  }
}
```

### 远程 HTTP 连接

如果你已将服务部署到公网（参见[部署指南](#-部署到服务器)），在支持 Streamable HTTP 的客户端中直接填入 URL：

```json
{
  "mcpServers": {
    "nowcoder": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

## 🛠 工具详细说明

所有工具均支持 `response_format` 参数（`"markdown"` 或 `"json"`，默认 `"markdown"`）。设为 `"json"` 时，列表类工具返回带分页元数据的结构化 JSON，详情类工具返回结构化对象。错误响应统一携带 `isError: true` 标记。

### `nowcoder_search` — 全站搜索

在牛客网上搜索讨论帖、面经、编程题、职位等内容。

```jsonc
// 搜索 Java 面经
{ "query": "Java面经", "type": "discuss", "page": 1 }

// 搜索算法题，返回 JSON
{ "query": "二叉树", "type": "problem", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 搜索关键词 |
| `type` | string | 否 | `"all"` / `"discuss"` / `"problem"` / `"job"`，默认 `"all"` |
| `page` | number | 否 | 页码，默认 1 |
| `response_format` | string | 否 | `"markdown"` / `"json"`，默认 `"markdown"` |

### `nowcoder_list_problems` — 浏览题库

列出 ACM/OJ 编程题目，返回 ID、标题、难度、通过率。

```jsonc
{ "difficulty": 3, "page": 1 }
{ "keyword": "二叉树", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 搜索关键词 |
| `difficulty` | number | 否 | `0`(全部) `1`-`5`(星级)，默认 `0` |
| `page` | number | 否 | 页码，默认 1 |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

### `nowcoder_get_problem` — 题目详情

获取完整的题目描述，包含输入输出格式、示例数据和时空限制。

```jsonc
{ "problemId": "1001" }
{ "problemId": "1001", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `problemId` | string | 是 | 题目 ID |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

### `nowcoder_get_problem_solutions` — 题解列表

获取社区提交的题解，包含作者、标题、摘要、点赞数。

```jsonc
{ "problemId": "1001", "page": 1 }
{ "problemId": "1001", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `problemId` | string | 是 | 题目 ID |
| `page` | number | 否 | 页码，默认 1 |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

### `nowcoder_list_topic_problems` — 专题题库

获取牛客网特定专题的题目列表。

```jsonc
{ "topicId": "295", "page": 1 }
{ "topicId": "199", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `topicId` | string | 是 | 专题 ID（见下表） |
| `page` | number | 否 | 页码，默认 1 |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

常用专题：

| ID | 专题名称 |
|----|---------|
| 295 | 面试 TOP101 |
| 199 | SQL 篇 |
| 196 | 面试高频题目 |
| 182 | 笔试大厂真题 |
| 383 | 算法学习篇 |
| 389 | 笔试模板必刷 |
| 260 | 前端篇 |

### `nowcoder_get_discussion` — 讨论帖详情

获取讨论帖的完整内容，支持 Markdown 或结构化 JSON 输出。

```jsonc
{ "url": "353154004265934848" }
{ "url": "https://www.nowcoder.com/discuss/353154004265934848", "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 完整 URL、discuss ID 或 feed UUID |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

### `nowcoder_get_hot_topics` — 热门内容

无需参数，返回牛客网当前热门讨论和话题（最多 20 条）。

### `nowcoder_browse_interview` — 浏览面经

浏览面试经验分享，支持按公司名称筛选。

```jsonc
{ "page": 1 }
{ "company": "字节跳动", "page": 1, "response_format": "json" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company` | string | 否 | 公司名称筛选 |
| `page` | number | 否 | 页码，默认 1 |
| `response_format` | string | 否 | `"markdown"` / `"json"` |

### JSON 响应格式

列表类工具在 `response_format: "json"` 时返回 `PaginatedResult` 结构：

```json
{
  "items": [ ... ],
  "page": 1,
  "count": 10,
  "has_more": true
}
```

- `has_more` 基于当前页是否有结果推断（爬虫场景无法获取精确总数）
- 详情类工具返回对应的结构化对象

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TRANSPORT` | `stdio` | 传输模式：`stdio` / `http` / `https` |
| `PORT` | `3000` | HTTP 模式监听端口 |
| `HOST` | `0.0.0.0` | HTTP 模式监听地址（本地开发建议 `127.0.0.1`） |
| `ALLOWED_ORIGINS` | `*` | CORS 允许的来源，多个用逗号分隔 |
| `SSL_CERT` | — | 自定义 SSL 证书路径 |
| `SSL_KEY` | — | 自定义 SSL 私钥路径 |

## 🌐 部署到服务器

### 方案一：Caddy 反向代理（推荐）

最简单的公网部署方案，Caddy 自动管理 Let's Encrypt 证书：

```bash
# 1. 以 HTTP 模式启动 MCP 服务
TRANSPORT=http PORT=3001 node dist/index.js

# 2. 安装 Caddy 并配置反向代理
apt install caddy
cat > /etc/caddy/Caddyfile << EOF
your-domain.com {
    reverse_proxy localhost:3001
}
EOF
systemctl restart caddy
```

MCP 地址：`https://your-domain.com/mcp`

> **没有域名？** 可以使用 `your-ip.sslip.io` 作为免费域名，Caddy 同样能自动获取证书。

### 方案二：Systemd 服务

```bash
cp deploy/nowcoder-mcp.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nowcoder-mcp
```

### 方案三：ngrok 内网穿透

```bash
# 启动 HTTP 模式
TRANSPORT=http node dist/index.js &

# 使用 ngrok 暴露
ngrok http 3000
```

MCP 地址：`https://xxxx.ngrok-free.app/mcp`

## 🏗 项目结构

```
src/
├── index.ts              # 入口，Stdio / HTTP / HTTPS 传输
├── constants.ts          # 配置常量
├── types.ts              # TypeScript 类型定义
├── schemas/
│   └── index.ts          # Zod 输入校验
├── services/
│   ├── browser.ts        # Playwright 浏览器管理（连接池、重试、反检测）
│   └── scraper.ts        # 页面解析工具（HTML→Markdown、截断）
└── tools/
    ├── search.ts         # 全站搜索
    ├── problems.ts       # 题库相关（列表、详情、题解、专题）
    ├── discussions.ts    # 讨论帖 & 热门内容
    └── interview.ts      # 面经浏览
```

## 🔧 开发

```bash
# 开发模式（热重载）
npm run dev

# HTTP 模式开发
npm run dev:http

# 构建
npm run build

# 清理
npm run clean
```

## 技术要点

- **MCP 规范合规**：错误响应携带 `isError: true`，列表工具返回分页元数据（`PaginatedResult`），支持 `response_format` 双格式输出
- **无状态 HTTP**：每个请求独立处理，不维护服务端会话，适合水平扩展和无状态部署
- **Playwright + Stealth 插件**：使用 `playwright-extra` 搭配反检测插件，规避网站的爬虫检测
- **智能重试**：对超时、网络错误、限流自动指数退避重试（最多 3 次）
- **资源优化**：拦截图片、字体、样式表等非必要资源，加速页面加载
- **CORS 安全**：通过 `ALLOWED_ORIGINS` 环境变量配置允许的跨域来源，默认 `*`
- **内容安全**：25,000 字符自动截断，防止上下文窗口溢出

## 📄 License

[MIT](LICENSE)

---

> **免责声明**：本项目仅供学习和研究使用。请遵守牛客网的使用条款，合理使用，避免高频请求对其服务造成影响。
