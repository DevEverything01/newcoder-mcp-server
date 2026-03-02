# 用 ngrok 暴露 MCP 服务到公网

当客户端（如 Notion）在云端运行时，无法访问你本机的 `localhost`。用 ngrok 可以把本地服务临时暴露到公网，获得一个 HTTPS 地址。

## 1. 安装 ngrok

**macOS (Homebrew):**
```bash
brew install ngrok
```

**或从官网下载：** https://ngrok.com/download

## 2. 注册并配置（首次使用）

1. 在 https://ngrok.com 注册账号
2. 在 Dashboard 获取你的 authtoken
3. 执行：
```bash
ngrok config add-authtoken <你的token>
```

## 3. 启动流程

**终端 1：启动 MCP 服务（HTTPS 模式）**
```bash
cd nowcoder-mcp-server
TRANSPORT=https npm start
# 或开发模式：TRANSPORT=https npm run dev
```

**终端 2：启动 ngrok**
```bash
ngrok http 3000
```

终端会输出类似：
```
Forwarding    https://a1b2c3d4.ngrok-free.app -> http://localhost:3000
```

## 4. 在 MCP 客户端配置

把 ngrok 给的 HTTPS 地址加上 `/mcp` 路径，例如：

```
https://a1b2c3d4.ngrok-free.app/mcp
```

填入客户端的「MCP 服务器 URL」即可。

## 5. 一键脚本（可选）

在 `nowcoder-mcp-server` 目录下执行：
```bash
./scripts/start-with-ngrok.sh
```

会同时启动 MCP 服务和 ngrok（需已安装 ngrok）。按 Ctrl+C 可同时停止。
