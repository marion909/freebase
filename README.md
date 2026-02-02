# Freebase

A self-hosted Supabase alternative with multi-tenant architecture, running on Debian/Hetzner with automatic Docker container provisioning per project.

## Features

- **User Authentication**: Email + Password with JWT sessions
- **Project Management**: Create isolated projects with auto-provisioned Docker containers
- **PostgreSQL Admin**: SQL Editor, Table Browser, Data Editor, CSV/SQL Import
- **Domain Management**: Standard domains + DNS-validated custom domains
- **Storage Limits**: 1GB hard limit per project with automatic backups
- **Network Isolation**: Each project in its own Docker network
- **Hard Delete Projects**: Remove container, network, and drop project database
- **Structured Logging**: JSON logs with daily rotation and error email alerts
- **Multi-Project API**: Project-level REST API (v1) via custom domains

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/freebase.git
cd freebase

# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
# Edit .env with your local configuration

# Start Docker services
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api
- **Traefik Dashboard**: http://localhost:8080

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Nest.js 10+
- **Language**: TypeScript 5+
- **Database**: PostgreSQL 16 (core) + per-project instances
- **ORM**: TypeORM 0.3
- **Authentication**: JWT + Passport.js
- **Docker**: Dockerode 4+

### Frontend
- **Framework**: Next.js 14+
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3+
- **UI Components**: shadcn/ui
- **HTTP Client**: Axios/Fetch

### Infrastructure
- **Container Orchestration**: Docker & Docker Compose 26+
- **Reverse Proxy**: Traefik 3+
- **SSL/TLS**: Let's Encrypt (via Traefik)
- **Monorepo**: Turborepo 2+
- **Package Manager**: pnpm 9+

## Project Structure

```
FREEBASE/
├── apps/
│   ├── backend/          # Nest.js API server
│   └── frontend/         # Next.js dashboard
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── shared/           # Shared utilities & validators
├── docker/               # Docker configurations
├── infrastructure/       # Server setup scripts
├── docs/                 # Documentation
├── docker-compose.yml    # Local dev environment
└── ROADMAP.md           # Implementation plan & phases
```

## Documentation

- [ROADMAP.md](./ROADMAP.md) - Complete implementation plan, architecture, and timeline
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design and data flow
- [docs/API.md](./docs/API.md) - API endpoint documentation
- [docs/LOCAL_DEV.md](./docs/LOCAL_DEV.md) - Local development guide
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Production deployment instructions
- [docs/SECURITY.md](./docs/SECURITY.md) - Security considerations and checklist

## Development

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:watch       # Watch mode
pnpm backend test     # Backend tests only
pnpm frontend test    # Frontend tests only
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues
pnpm type-check       # TypeScript type checking
```

### Building
```bash
pnpm build            # Build all packages
```

## Database

### Create Migrations
```bash
# Backend
pnpm backend run typeorm migration:generate src/migrations/YourMigration
```

### Run Migrations
```bash
pnpm db:migrate
```

### Seed Data (Optional)
```bash
pnpm db:seed
```

## Deployment

### Production Setup (Hetzner)

Note: The backend and frontend production images bundle runtime dependencies during the Docker build (see docker/Dockerfile.backend and docker/Dockerfile.frontend).

```bash
# SSH into your server
ssh root@your-server-ip

# Clone and setup
cd /opt
git clone https://github.com/yourusername/freebase.git
cd freebase
chmod +x infrastructure/setup.sh
./infrastructure/setup.sh

# Create production environment file
nano .env.production
# Add all production secrets

# Make Docker Compose load production env by default
cp .env.production .env

# Start services
docker-compose -f docker-compose.production.yml up -d
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## Environment Variables

See [.env.example](./.env.example) for all available configuration options.

### Critical for Production
- `JWT_SECRET` - Random 32+ character string
- `ENCRYPTION_KEY` - 32-byte hex key (generate with `openssl rand -hex 32`)
- `DB_PASSWORD` - Strong database password
- `SMTP_*` - Email configuration
- `LOG_ALERT_RECIPIENTS` - Comma-separated alert recipients
- `LOG_DIR` - Log directory for rotated files
- `HETZNER_BACKUP_*` - Backup space credentials

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

All code must pass linting, type checking, and tests before merge.

## Security

⚠️ **Important**: See [docs/SECURITY.md](./docs/SECURITY.md) for security considerations, encryption setup, and hardening guidelines before production deployment.

Key points:
- All secrets in `.env` (not in code)
- Passwords hashed with bcrypt
- Database credentials encrypted with AES-256
- Network isolation per project
- Regular automated backups
- Detailed error logging (sanitized in production)

## License

MIT (or your preferred license)

## Support

For issues, feature requests, or questions, open an issue on [GitHub](https://github.com/marion909/freebase).

## Roadmap

### Phase 1: MVP (Weeks 1-8) ✓ Current
- Authentication (Email/PW)
- Project management
- Database admin UI
- Domain management (standard + custom)
- Storage monitoring & backups
- Hard delete support

### Phase 2: Enhanced Features (Future)
- OAuth authentication (Google, Apple, GitHub)
- Project-level REST API
- Teams & collaboration
- Advanced SQL features (views, triggers, procedures)
- API keys & scoped permissions
- Realtime features (WebSocket)
- Rate limiting & quotas
- Billing integration

See [ROADMAP.md](./ROADMAP.md) for comprehensive phase breakdown, timeline, and technical details.

## Acknowledgments

Inspired by [Supabase](https://supabase.com) - the open-source Firebase alternative.

---

**Status**: Under Development  
**Latest Release**: v1.0.0-alpha  
**Last Updated**: February 2026
