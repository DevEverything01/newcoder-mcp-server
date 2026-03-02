#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# 检查 ngrok 是否安装
if ! command -v ngrok &>/dev/null; then
  echo "请先安装 ngrok: brew install ngrok"
  echo "或访问 https://ngrok.com/download"
  exit 1
fi

# 先启动 MCP 服务（后台）
echo "启动 MCP 服务 (HTTPS) ..."
if [ -f dist/index.js ]; then
  TRANSPORT=https node dist/index.js &
else
  TRANSPORT=https npx tsx src/index.ts &
fi
SERVER_PID=$!

# 等待服务就绪
sleep 3
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "MCP 服务启动失败"
  exit 1
fi

echo "MCP 服务已启动 (PID: $SERVER_PID)"
echo ""
echo "启动 ngrok 暴露到公网..."
echo "请在 ngrok 输出的 Forwarding 行找到 HTTPS 地址，加上 /mcp 填入客户端"
echo "例如: https://xxxx.ngrok-free.app/mcp"
echo ""

# 前台运行 ngrok，Ctrl+C 会同时结束
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM
ngrok http 3000
