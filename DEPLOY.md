# 部署说明

## 连接失败原因

`fetch failed` 通常是因为客户端**拒绝自签名证书**。Notion 等云端客户端不会信任自签名证书，导致 TLS 握手失败。

**Token 不是原因**：本服务不校验 token，验证方式选「无」即可。

## 解决方案：使用受信任证书

### 方案一：域名 + Caddy（推荐）

1. 将域名解析到服务器 IP（如 `mcp.example.com` → `172.245.189.138`）
2. 在服务器执行：
```bash
chmod +x deploy/caddy-setup.sh
./deploy/caddy-setup.sh mcp.example.com
```
3. 使用 `https://mcp.example.com/mcp` 连接

Caddy 会自动申请 Let's Encrypt 证书，客户端会信任。

### 方案二：ngrok

ngrok 提供带有效证书的 HTTPS 地址，无需域名：
```bash
ngrok http 3001
```
使用输出的 `https://xxx.ngrok-free.app/mcp` 连接。

### 方案三：自签名 + 客户端信任（仅限本地）

若客户端运行在本机且支持「忽略证书错误」，可继续用 `https://localhost:3001/mcp`。云端客户端通常不支持。
