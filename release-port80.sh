#!/bin/bash
set -e

echo "🛑 Stopping pre-installed Docker containers (n8n/traefik) that are occupying Port 80..."

# 1. Stop and disable Docker containers on port 80
docker stop $(docker ps -q) 2>/dev/null || true
systemctl stop docker 2>/dev/null || true
systemctl disable docker 2>/dev/null || true

# 2. Kill any stray processes holding port 80 or 443
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true

# 3. Start Nginx
echo "🚀 Starting Nginx..."
systemctl restart nginx
systemctl enable nginx

# 4. Start Next.js Portfolio & Python AI backend on PM2
echo "⚡ Starting PM2 services..."
cd /var/www/portfolio
pm2 delete all 2>/dev/null || true
pm2 start npm --name "portfolio" -- start
pm2 start backend/app.py --name "ai-backend" --interpreter python3
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 5. Open firewall ports
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo "=========================================================="
echo "🎉 PORT 80 RELEASED & PORTFOLIO DEPLOYED!"
echo "🌐 Your portfolio is now LIVE at:"
echo "   http://74.91.133.166"
echo "   http://jehobiscarra.com"
echo "=========================================================="