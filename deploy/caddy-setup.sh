#!/bin/bash
# 在服务器上运行此脚本，为 MCP 配置受信任的 HTTPS 证书
# 前提：已有域名解析到本机公网 IP，例如 mcp.yourdomain.com -> 172.245.189.138

set -e

DOMAIN="${1:?用法: $0 <域名>}"
# 例如: ./caddy-setup.sh mcp.yourdomain.com

echo "将为域名 $DOMAIN 配置 Caddy + Let's Encrypt"

# 安装 Caddy
apt-get update -qq
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq && apt-get install -y caddy

# 创建 Caddyfile
cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
    reverse_proxy localhost:3001
}
EOF

# 重启 Caddy（会自动申请 Let's Encrypt 证书）
systemctl enable caddy
systemctl restart caddy

echo ""
echo "完成！MCP 地址: https://$DOMAIN/mcp"
echo "请确保域名 $DOMAIN 已解析到本机公网 IP，且 80/443 端口开放"
