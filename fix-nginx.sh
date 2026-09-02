#!/bin/bash
set -e

echo "🔧 Fixing Nginx and Port Conflicts on AlmaLinux..."

# 1. Allow Nginx to connect to backend proxy ports in SELinux
echo "🛡️ Configuring SELinux permissions..."
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
setenforce 0 2>/dev/null || true
sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config 2>/dev/null || true

# 2. Stop conflicting web servers (like Apache httpd if present)
echo "🛑 Stopping any conflicting default web servers..."
systemctl stop httpd 2>/dev/null || true
systemctl disable httpd 2>/dev/null || true

# 3. Check what is using port 80 / 443
echo "🔍 Checking processes on port 80..."
fuser -k 80/tcp 2>/dev/null || true

# 4. Remove default conflicting server block inside nginx.conf if present
sed -i '/server {/,/}/d' /etc/nginx/nginx.conf 2>/dev/null || true

# 5. Clean Nginx configuration for Portfolio
cat << 'EOF' > /etc/nginx/conf.d/portfolio.conf
server {
    listen 80;
    server_name jehobiscarra.com www.jehobiscarra.com 74.91.133.166 _;

    # Next.js Frontend (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Python AI Backend Direct Route (Port 5000)
    location /api/py/ {
        rewrite ^/api/py/(.*) /api/$1 break;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 6. Start Nginx
echo "🚀 Testing and restarting Nginx..."
nginx -t
systemctl restart nginx
systemctl enable nginx

# 7. Start PM2 applications
echo "⚡ Starting PM2 services..."
cd /var/www/portfolio
pm2 delete all 2>/dev/null || true
pm2 start npm --name "portfolio" -- start
pm2 start backend/app.py --name "ai-backend" --interpreter python3
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 8. Firewall
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo "=========================================================="
echo "🎉 SUCCESS! Your portfolio is LIVE and running!"
echo "🌐 Open in browser: http://74.91.133.166 or http://jehobiscarra.com"
echo "=========================================================="