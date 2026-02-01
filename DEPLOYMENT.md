# Freebase Deployment Guide

## Production Deployment to Hetzner VPS

### Prerequisites

- Docker and Docker Compose installed on the server
- Hetzner VPS or similar Linux server (Debian 12 tested)
- SSH access to the server
- Domain name configured with DNS pointing to server IP
- GitHub Container Registry (ghcr.io) access

### Server Setup (One-time)

1. **Connect to the server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Create application directory:**
   ```bash
   mkdir -p /opt/freebase
   cd /opt/freebase
   ```

3. **Clone the repository:**
   ```bash
   git clone https://github.com/marion909/freebase.git .
   ```

4. **Create environment file:**
   ```bash
   cp .env.production.template .env.production
   ```

5. **Generate secrets and update .env.production:**
   ```bash
   # Generate JWT_SECRET (base64 encoded random 32 bytes)
   openssl rand -base64 32
   
   # Generate ENCRYPTION_KEY (64 hex characters)
   openssl rand -hex 32
   
   # Generate DB_PASSWORD (base64 encoded)
   openssl rand -base64 32
   ```

   Edit `.env.production` and update:
   - `JWT_SECRET` - Generated value
   - `ENCRYPTION_KEY` - Generated value
   - `DB_PASSWORD` - Generated value
   - `ROOT_DOMAIN` - Your domain (e.g., yourdomain.com)
   - `ACME_EMAIL` - Your email for Let's Encrypt
   - Other optional SMTP settings if needed

6. **Copy .env to .env.production (Docker Compose will read it automatically):**
   ```bash
   cp .env.production .env
   ```

7. **Create traefik configuration:**
   ```bash
   mkdir -p docker/traefik/dynamic
   touch docker/traefik/acme.json
   chmod 600 docker/traefik/acme.json
   ```

### Initial Deployment

1. **Pull the latest images:**
   ```bash
   cd /opt/freebase
   docker-compose -f docker-compose.production.yml pull
   ```

2. **Start the services:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Verify services are running:**
   ```bash
   docker-compose -f docker-compose.production.yml ps
   
   # Check logs
   docker-compose -f docker-compose.production.yml logs -f backend
   ```

4. **Initialize database (if needed):**
   ```bash
   docker-compose -f docker-compose.production.yml run --rm backend pnpm run db:migrate
   ```

### Updates and Redeployment

1. **Pull latest images:**
   ```bash
   cd /opt/freebase
   docker-compose -f docker-compose.production.yml pull
   ```

2. **Restart services:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Monitor startup:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

### Troubleshooting

#### PostgreSQL not starting
- Check if volumes exist: `docker volume ls | grep freebase`
- Verify .env.production has DB_PASSWORD: `cat .env.production`
- If old cached volumes exist, remove them:
  ```bash
  docker-compose -f docker-compose.production.yml down -v
  docker-compose -f docker-compose.production.yml up -d
  ```

#### Backend/Frontend not starting
- Check logs: `docker-compose -f docker-compose.production.yml logs backend`
- Verify environment variables are loaded: `docker-compose config`
- If modules are missing, rebuild the image on the server:
  ```bash
  docker-compose -f docker-compose.production.yml pull
  docker-compose -f docker-compose.production.yml down
  docker-compose -f docker-compose.production.yml up -d
  ```

#### SSL/Let's Encrypt certificate issues
- Check Traefik logs: `docker-compose -f docker-compose.production.yml logs traefik`
- Verify ACME_EMAIL is set in .env.production
- Check domain is accessible: `curl http://yourdomain.com`

### Container Monitoring

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend

# Check container health
docker-compose -f docker-compose.production.yml ps

# Execute command in container
docker-compose -f docker-compose.production.yml exec backend pnpm run db:seed

# Stop all services
docker-compose -f docker-compose.production.yml down

# Remove volumes and restart clean
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

### Database Management

```bash
# Connect to PostgreSQL container
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d freebase

# View database size
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d freebase -c "SELECT pg_size_pretty(pg_database_size('freebase'));"

# Backup database
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U postgres freebase > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d freebase
```

### GitHub Actions CI/CD

The GitHub Actions workflow automatically:
1. Builds Docker images when pushing to the `main` branch
2. Tags images with commit SHA and `latest`
3. Pushes images to `ghcr.io/marion909/freebase/[backend|frontend]:latest`

To deploy after GitHub Actions build:
```bash
cd /opt/freebase
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### Backup and Recovery

```bash
# Backup docker volumes
docker run --rm -v freebase_postgres-core:/volume -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /volume

# Backup application configuration
tar czf config-backup.tar.gz .env.production docker/traefik/acme.json

# Restore PostgreSQL
docker volume rm freebase_postgres-core
docker volume create freebase_postgres-core
docker run --rm -v freebase_postgres-core:/volume -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /volume --strip-components=1
```

## Security Notes

- Keep `.env.production` secure - never commit to git
- Rotate secrets regularly (JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD)
- Use strong database passwords (32+ characters, mix of types)
- Enable firewall rules to restrict access to database ports
- Keep server OS and Docker updated
- Monitor application logs for suspicious activity
- Set up SSL certificate auto-renewal (Traefik handles this with Let's Encrypt)
