#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Automated Deployment Script for AlmaLinux VPS (jehobiscarra.com / 74.91.133.166)
# Includes automatic Swap memory configuration to prevent OOM build crashes.
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=========================================================="
echo "🚀 Starting Full Deployment on AlmaLinux VPS..."
echo "=========================================================="

# 0. Configure 4GB Swap Space if none exists (Prevents Out-Of-Memory crashes during build)
if [ $(swapon --show | wc -l) -eq 0 ]; then
    echo "💾 No swap detected. Creating 4GB Swapfile to prevent build memory limits..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo "✅ 4GB Swap created and active!"
else
    echo "✅ Swap memory already active."
fi

# 1. Update system packages
echo "📦 Updating system packages..."
dnf install -y epel-release git curl wget nginx python3 python3-pip

# 2. Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install PM2 process manager globally
echo "📦 Installing PM2..."
npm install -g pm2

# 4. Clone or update repository in /var/www/portfolio
APP_DIR="/var/www/portfolio"
echo "📂 Setting up repository in $APP_DIR..."
mkdir -p /var/www

if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Existing repository found. Pulling latest main..."
    cd $APP_DIR
    git fetch origin main
    git reset --hard origin/main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/Jehooooo/Portfolio.git $APP_DIR
    cd $APP_DIR
fi

# 5. Install frontend dependencies and build with optimized memory allocation
echo "🔨 Installing npm dependencies..."
npm install

echo "🔨 Building Next.js production bundle (with memory optimization)..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 6. Install Python backend dependencies
echo "🐍 Setting up Python AI backend..."
cd $APP_DIR/backend
pip3 install -r requirements.txt
cd $APP_DIR

# 7. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx reverse proxy..."
tee /etc/nginx/conf.d/portfolio.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name jehobiscarra.com www.jehobiscarra.com 74.91.133.166;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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

# Test and restart Nginx
nginx -t
systemctl enable nginx
systemctl restart nginx

# 8. Start applications with PM2
echo "⚡ Starting background services with PM2..."
cd $APP_DIR
pm2 delete portfolio 2>/dev/null || true
pm2 delete ai-backend 2>/dev/null || true

# Start Next.js on port 3000
pm2 start npm --name "portfolio" -- start

# Start Python backend on port 5000
pm2 start backend/app.py --name "ai-backend" --interpreter python3

# Save PM2 state to auto-start on server reboots
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true

# 9. Configure Firewall (firewalld on AlmaLinux)
echo "🛡️ Opening HTTP (80) and HTTPS (443) ports in firewall..."
firewall-cmd --permanent --add-service=http || true
firewall-cmd --permanent --add-service=https || true
firewall-cmd --reload || true

echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "🌐 Your portfolio is now LIVE at:"
echo "   http://jehobiscarra.com"
echo "   http://74.91.133.166"
echo "=========================================================="