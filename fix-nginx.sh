#!/bin/bash
set -e

echo "🔧 Writing clean Nginx configuration on AlmaLinux..."

# 1. Kill any process blocking port 80 / 443 (like traefik or old apache)
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true

# 2. SELinux permissive / allow network connect
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
setenforce 0 2>/dev/null || true

# 3. Clean out old conf.d files
rm -f /etc/nginx/conf.d/*.conf

# 4. Write pristine, complete /etc/nginx/nginx.conf
cat << 'EOF' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen       80 default_server;
        listen       [::]:80 default_server;
        server_name  jehobiscarra.com www.jehobiscarra.com 74.91.133.166 _;

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

        # Python Backend Route (Port 5000)
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
}
EOF

# 5. Validate and restart Nginx
echo "🚀 Testing Nginx syntax..."
nginx -t

echo "🚀 Restarting Nginx service..."
systemctl restart nginx
systemctl enable nginx

# 6. Ensure PM2 processes are running
echo "⚡ Starting PM2 services..."
cd /var/www/portfolio
pm2 delete all 2>/dev/null || true
pm2 start npm --name "portfolio" -- start
pm2 start backend/app.py --name "ai-backend" --interpreter python3
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 7. Ensure Firewall allows HTTP
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo "=========================================================="
echo "🎉 SUCCESS! Your portfolio is LIVE and running!"
echo "🌐 Open in your browser:"
echo "   http://74.91.133.166"
echo "   http://jehobiscarra.com"
echo "=========================================================="