# Freebase Configuration

## Production Infrastructure

- **Server**: Hetzner Debian 12 VPS
- **IP Address**: 46.225.53.125
- **Domain**: Neuhauser.network
- **GitHub Repository**: https://github.com/marion909/freebase

## Configuration Files Updated

The following configuration files have been updated for production:

### Environment Configuration
- `.env.example`: Updated with Neuhauser.network domain references
  - `ROOT_DOMAIN=Neuhauser.network`
  - `SMTP_USER=noreply@Neuhauser.network`
  - `ACME_EMAIL=noreply@Neuhauser.network`

### Docker Configuration
- `docker-compose.production.yml`: Ready for production deployment
- Traefik configured with Let's Encrypt ACME for SSL/TLS

### Documentation Updated
- `docs/DEPLOYMENT.md`: Updated with real server IP (46.225.53.125)
- `docs/DEPLOYMENT.md`: Updated DNS records pointing to real IP
- `ROADMAP.md`: All domain references updated to Neuhauser.network
- `README.md`: GitHub repository link added

### Infrastructure Scripts
- `infrastructure/setup.sh`: Setup guide with correct server IP and domain

## DNS Configuration Required

In Hetzner DNS Console, configure the following A records:

```
Domain: Neuhauser.network

A Records:
  Neuhauser.network              → 46.225.53.125
  *.Neuhauser.network            → 46.225.53.125
  api.Neuhauser.network          → 46.225.53.125 (optional)
```

## Git Repository Setup

The project has been initialized as a Git repository and pushed to GitHub:

```bash
# Repository: https://github.com/marion909/freebase
# Branch: main
# Initial Commit: feat: Freebase foundation setup - monorepo with Docker, Traefik, GitHub Actions, and documentation
```

## Next Steps for Deployment

1. **Configure GitHub Actions Secrets**:
   - `SSH_KEY`: Private SSH key for Hetzner server authentication
   - `HETZNER_HOST`: Server IP (46.225.53.125)
   - `HETZNER_USER`: SSH user (root or configured user)

2. **Configure DNS**: Set up A records for Neuhauser.network at Hetzner DNS

3. **Deploy Manually First**:
   ```bash
   ssh root@46.225.53.125
   cd /opt
   git clone https://github.com/marion909/freebase.git
   cd freebase
   chmod +x infrastructure/setup.sh
   ./infrastructure/setup.sh
   ```

4. **Set Production Environment Variables**: Edit `.env.production` with:
   - Database passwords
   - SMTP credentials
   - ACME email
   - Hetzner Backup Space credentials
   - JWT secrets and encryption keys

## Phase 2: Authentication Development

Ready to begin Phase 2 (Authentication) implementation:

- Create Nest.js authentication module
- Create Next.js auth pages
- Set up Passport.js + JWT strategy
- Implement email verification
- Create database migrations

See ROADMAP.md for complete implementation plan.
