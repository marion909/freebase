# Deployment Guide

Complete instructions for deploying Freebase to production on Hetzner.

## Prerequisites

- Debian 12 VPS on Hetzner
- Root or sudo access
- Domain: Neuhauser.network (configured on Hetzner DNS)
- GitHub repository with GitHub Actions configured
- Hetzner Backup Space account (for backups)

## Deployment Steps

### 1. Server Initial Setup

SSH into your Hetzner server:

```bash
ssh root@<your-server-ip>
```

Run the setup script:

```bash
cd /opt
git clone https://github.com/yourusername/freebase.git
cd freebase
chmod +x infrastructure/setup.sh
./infrastructure/setup.sh
```

This script installs:
- Docker & Docker Compose
- Node.js (for potential future needs)
- Creates necessary directories
- Sets up log rotation

### 2. Create Production Environment File

```bash
cd /opt/freebase
nano .env.production
```

Add all production configuration:

```env
# Environment
NODE_ENV=production
LOG_LEVEL=WARN

# JWT & Authentication
JWT_SECRET=$(openssl rand -base64 32)  # Generate random
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=$(openssl rand -hex 32)  # Generate random

# Database (Core PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=$(openssl rand -base64 32)  # Generate strong password
DB_NAME=freebase

# Docker
DOCKER_HOST=unix:///var/run/docker.sock

# Email (SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@Neuhauser.network
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=Freebase

# Hetzner Backup Space
HETZNER_BACKUP_ENDPOINT=https://backup.fsn1.your-account.hetzner.cloud
HETZNER_BACKUP_KEY=your-s3-access-key
HETZNER_BACKUP_SECRET=your-s3-secret-key
HETZNER_BACKUP_BUCKET=freebase-backups

# Domains
ROOT_DOMAIN=Neuhauser.network
FRONTEND_URL=https://Neuhauser.network
API_URL=https://api.Neuhauser.network
API_PREFIX=/api/v1

# ACME (Let's Encrypt)
ACME_EMAIL=noreply@Neuhauser.network
```

### 3. Configure DNS

In Hetzner DNS Console:

```
Domain: Neuhauser.network

A Records:
  Neuhauser.network              → <server-ip>
  *.Neuhauser.network            → <server-ip>
  api.Neuhauser.network          → <server-ip> (optional, if using separate subdomain)

MX Records (if email needed):
  10 mail.Neuhauser.network

TXT Records (if SPF/DKIM):
  v=spf1 mx -all (or your actual SPF)
```

### 4. Pull Docker Images

```bash
cd /opt/freebase
docker-compose -f docker-compose.production.yml pull
```

### 5. Run Database Migrations

```bash
docker-compose -f docker-compose.production.yml run --rm backend npm run db:migrate
```

### 6. Start Services

```bash
docker-compose -f docker-compose.production.yml up -d
```

Verify services are running:

```bash
docker-compose ps
```

All containers should show "Up".

### 7. Verify Deployment

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Test frontend
curl https://Neuhauser.network

# Test API
curl https://api.Neuhauser.network/api/v1/health

# Check Traefik dashboard (optional, if enabled)
curl https://traefik.Neuhauser.network/dashboard
```

All should return 200 OK.

## GitHub Actions Deployment

### Setup GitHub Secrets

In GitHub repository settings (Settings → Secrets and variables → Actions):

1. **HETZNER_HOST**: Your server IP (e.g., `5.78.1.2.3`)
2. **HETZNER_SSH_KEY**: Your SSH private key (with newlines as `\n`)
3. **SLACK_WEBHOOK**: (Optional) Slack webhook for notifications

### Automated Deployment

1. Push to main branch with tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions workflow automatically:
   - Builds Docker images
   - Pushes to ghcr.io
   - SSHs into Hetzner
   - Pulls latest images
   - Runs migrations
   - Restarts services

3. Monitor deployment:
   - Go to GitHub Actions tab
   - Watch deploy workflow
   - Get Slack notification (if configured)

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Health

```bash
# Check container status
docker-compose ps

# Inspect a container
docker-compose exec backend sh

# Check resource usage
docker stats
```

### Database Backup

Backups are automatic (daily at 3 AM), but you can trigger manual:

```bash
# Manual backup via API
curl -X POST https://api.Neuhauser.network/api/v1/projects/{id}/backups/manual \
  -H "Authorization: Bearer {token}"

# Or via CLI (future)
```

### Disk Space

Monitor disk space:

```bash
# Check disk usage
df -h

# Check specific directories
du -sh /var/lib/docker
du -sh /opt/freebase

# Cleanup old backups (if local)
find /opt/freebase/backups -mtime +7 -delete
```

### Update Services

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Or redeploy from GitHub (recommended)
# Just push a new tag: v1.0.1
```

## SSL/TLS Certificates

Traefik automatically manages Let's Encrypt certificates:

```bash
# View certificates
docker-compose exec traefik ls -la /letsencrypt/

# Check certificate expiry
docker-compose exec traefik cat /letsencrypt/acme.json | jq '.acme[].certificates[].cert'

# Manual renewal (usually not needed)
docker-compose exec traefik traefik-certs
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Common issues:
# - Port already in use: check `ss -tulpn | grep LISTEN`
# - Disk space full: check `df -h`
# - Permission denied: ensure running as root or sudo
```

### Database Connection Issues

```bash
# Test PostgreSQL
docker-compose exec postgres psql -U postgres -d freebase -c "SELECT 1"

# Check connection string
docker-compose config | grep DB_
```

### Traefik Issues

```bash
# Check Traefik logs
docker-compose logs traefik

# Verify Docker socket access
ls -la /var/run/docker.sock

# Check Traefik configuration
docker-compose exec traefik cat /traefik.yml
```

### SSL Certificate Errors

```bash
# Wait for Let's Encrypt challenge (can take a few minutes)
sleep 60
curl -I https://Neuhauser.network

# Force certificate renewal
docker-compose exec traefik traefik-certs
docker-compose restart traefik
```

### Project Container Issues

```bash
# List Docker networks
docker network ls

# Inspect project network
docker network inspect freebase-project-<slug>

# Check PostgreSQL container in project network
docker exec freebase-project-<slug>-postgres \
  psql -U postgres -d project_<uuid> -c "SELECT 1"
```

## Backup & Recovery

### Manual Backup

```bash
# Backup Core Database
docker exec freebase-postgres pg_dump -U postgres freebase | gzip > core-backup-$(date +%Y%m%d).sql.gz

# Backup all project databases (list them first)
docker network ls | grep freebase-project
# Then dump each one

# Upload to local storage
cp core-backup-*.sql.gz /backup/
```

### Restore from Backup

```bash
# Restore Core Database
gunzip < core-backup-20260201.sql.gz | docker exec -i freebase-postgres \
  psql -U postgres freebase

# Or via S3 (if using Hetzner Backup Space)
aws s3 cp s3://freebase-backups/core-backup-20260201.sql.gz - | gunzip | \
  docker exec -i freebase-postgres psql -U postgres freebase
```

## Performance Tuning

### PostgreSQL Configuration

```bash
# Edit PostgreSQL config
docker-compose exec postgres sh -c 'psql -U postgres -d freebase << EOF
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;
EOF'
```

### Resource Limits

Edit `docker-compose.production.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'        # Increase from 1
          memory: 1G       # Increase from 512M
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

Then restart:

```bash
docker-compose -f docker-compose.production.yml up -d
```

## Security Hardening

### Firewall Rules

```bash
# Only allow HTTP/HTTPS from internet
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from <your-ip> to any port 22  # SSH
sudo ufw enable

# Or via Hetzner Cloud Console
# Create firewall: Allow ports 80, 443 from anywhere
```

### SSH Security

```bash
# Disable password auth
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin prohibit-password
sudo systemctl restart sshd
```

### API Rate Limiting

Add to backend (future):

```typescript
// Implement in auth controller
@UseGuards(RateLimitGuard)
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

## Monitoring Stack (Optional)

### Prometheus + Grafana

```bash
# Create monitoring directory
mkdir -p /opt/freebase/monitoring

# Add Prometheus config
# Add Grafana dashboards

# Include in docker-compose
# Then access: https://grafana.Neuhauser.network
```

### Loki Logging

```bash
# Configure Loki in docker-compose
# Forward container logs to Loki
# Query via Grafana
```

## Rollback Procedure

If a deployment breaks:

```bash
# Get previous image tag
docker images | grep freebase/backend

# Stop current version
docker-compose -f docker-compose.production.yml down

# Update docker-compose with previous tag
# Or: git checkout <previous-tag>

# Restart with previous version
docker-compose -f docker-compose.production.yml up -d

# Notify users of rollback
```

## Maintenance Schedule

### Daily
- Monitor disk space (automated alerts)
- Check service health (automated health checks)
- Review error logs

### Weekly
- Backup verification (test restore)
- Performance review (check query logs)
- Security audit (review auth logs)

### Monthly
- Update Docker images (`docker-compose pull`)
- Review and update dependencies
- Test disaster recovery procedure
- Security patch review

### Quarterly
- Full system audit
- Capacity planning
- Performance optimization
- Security penetration testing (optional)

## Support & Debugging

For issues, check:

1. **Logs**: `docker-compose logs -f`
2. **Health Checks**: `docker ps` (should all be "Up")
3. **DNS**: `dig Neuhauser.network`
4. **SSL**: `openssl s_client -connect Neuhauser.network:443`
5. **API**: `curl -v https://api.Neuhauser.network/api/v1/health`

---

**Last Updated**: February 2026
