#!/bin/bash
# Freebase Server Setup Script
# Run on Debian 12 VPS at Hetzner
# Usage: ./infrastructure/setup.sh

set -e

echo "🚀 Starting Freebase server setup..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker..."
  apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
  
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  
  # Start Docker
  systemctl start docker
  systemctl enable docker
else
  echo "✅ Docker already installed"
fi

# Install Docker Compose (standalone)
if ! command -v docker-compose &> /dev/null; then
  echo "🐳 Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
else
  echo "✅ Docker Compose already installed"
fi

# Install Node.js (for potential scripts)
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "✅ Node.js already installed"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /opt/freebase
mkdir -p /opt/freebase/docker/traefik
mkdir -p /opt/freebase/docker/traefik/dynamic
mkdir -p /var/log/freebase
mkdir -p /var/lib/freebase-backups

# Set permissions
chmod 755 /var/log/freebase
chmod 755 /var/lib/freebase-backups

# Create Docker volumes directory
mkdir -p /var/lib/docker/volumes

# Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/freebase << EOF
/var/log/freebase/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 root root
  sharedscripts
  postrotate
    docker-compose -f /opt/freebase/docker-compose.production.yml restart backend 2>/dev/null || true
  endscript
}
EOF

# Install UFW (firewall)
echo "🔒 Installing firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
echo "y" | ufw enable 2>/dev/null || true

# Create .env.production template
if [ ! -f /opt/freebase/.env.production ]; then
  echo "📝 Creating .env.production template..."
  cat > /opt/freebase/.env.production.template << 'EOF'
# Production Environment
NODE_ENV=production
LOG_LEVEL=WARN
LOG_DIR=/var/log/freebase
LOG_ALERT_RECIPIENTS=admin@example.com,alerts@example.com

# JWT & Authentication
JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_32
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=CHANGE_ME_GENERATE_WITH_openssl_rand_-hex_32

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=freebase

# Docker
DOCKER_HOST=unix:///var/run/docker.sock

# Email
SMTP_HOST=CHANGE_ME
SMTP_PORT=587
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
SMTP_FROM_NAME=Freebase

# Hetzner Backup
HETZNER_BACKUP_ENDPOINT=CHANGE_ME
HETZNER_BACKUP_KEY=CHANGE_ME
HETZNER_BACKUP_SECRET=CHANGE_ME
HETZNER_BACKUP_BUCKET=freebase-backups

# Domains
ROOT_DOMAIN=Neuhauser.network
FRONTEND_URL=https://Neuhauser.network
API_URL=https://api.Neuhauser.network
API_PREFIX=/api/v1

# ACME
ACME_EMAIL=noreply@Neuhauser.network
EOF
  echo "⚠️  Please edit /opt/freebase/.env.production.template and rename to .env.production"
fi

# Install required tools
echo "🛠️  Installing required tools..."
apt-get install -y \
  git \
  curl \
  wget \
  nano \
  jq \
  htop \
  net-tools \
  openssl

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit /opt/freebase/.env.production with your settings"
echo "2. Run: cd /opt/freebase && docker-compose -f docker-compose.production.yml pull"
echo "3. Run: cd /opt/freebase && docker-compose -f docker-compose.production.yml up -d"
echo "4. Verify: curl https://Neuhauser.network"
echo ""
