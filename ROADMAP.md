# Freebase Implementation Roadmap

**Version**: 1.0  
**Last Updated**: February 1, 2026  
**Project**: Freebase – Supabase Clone on Debian/Hetzner with Neuhauser.network

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Decisions](#architecture--decisions)
3. [Technology Stack](#technology-stack)
4. [Detailed Phases](#detailed-phases)
5. [Development Timeline](#development-timeline)
6. [Deployment Instructions](#deployment-instructions)
7. [Post-MVP Features](#post-mvp-features)

---

## Project Overview

**Freebase** is a self-hosted Supabase alternative running on a single Debian server at Hetzner with Neuhauser.network as the root domain.

### Key Features (MVP)
- **User Authentication**: Email + Password registration, email verification, JWT-based sessions
- **Project Management**: Users can create isolated projects with auto-provisioned Docker containers
- **PostgreSQL Admin**: Full SQL Editor, Table Browser, Data Editor, CSV/SQL Import
- **Domain Management**: Standard domains (`{slug}.Neuhauser.network`) + DNS-validated custom domains
- **Storage Limits**: 1GB hard limit per project with automatic daily backups to Hetzner
- **Network Isolation**: Each project runs in its own Docker network (no cross-project access)
- **Multi-Project API**: Each project's custom domain exposes a project-level REST API (v1)

### Decisions Made

| # | Question | Answer | Rationale |
|---|----------|--------|-----------|
| 1 | Frontend + Backend deployment | Same domain (path-based) | Simpler deployment, single SSL cert, easier Traefik config |
| 2 | Project-level API | Yes, via custom domain | Allows external integrations per project |
| 3 | Teams / User Invites MVP | Single user per project | Keep MVP focused, add later |
| 4 | API Versioning | Yes, plan v1/v2 | Prepare for future breaking changes |
| 5 | Error Messages | Detailed in all environments | Better debugging, will add user-friendly wrapper in frontend |

---

## Architecture & Decisions

### Deployment Model
- **Single Server**: Debian at Hetzner (5.78.x.x or similar)
- **Root Domain**: `Neuhauser.network` (A record + wildcard `*.Neuhauser.network` point to server IP)
- **Routing**: Traefik reverse proxy (port 80/443) routes requests to correct service
- **Database**: Core PostgreSQL (in docker) for user/project metadata; project-specific PostgreSQL instances (isolated containers)

### Path-Based Routing Strategy
```
Neuhauser.network/
  ├── /admin          → Frontend (Next.js) – Project dashboard
  ├── /api/v1/*       → Backend API – User/Project management
  ├── /auth/*         → Auth endpoints (login, register, verify)
  └── /{slug}         → Redirect to /admin or API endpoint (for custom domains)

Custom Domains (e.g., myapp.com):
  ├── /               → Project-level REST API (v1) or custom app
  └── /admin          → Project admin panel (if needed)
```

### Network Architecture
```
Host (Debian/Hetzner)
│
├─ Docker Network: freebase-core
│  ├─ PostgreSQL Container (Core DB)
│  ├─ Backend Container (Nest.js API)
│  ├─ Frontend Container (Next.js)
│  └─ Traefik Container (Reverse Proxy)
│
└─ Docker Networks: freebase-project-{slug} (one per project)
   ├─ PostgreSQL Container (Project-specific DB)
   └─ (Future: Project-specific API/backend)
```

### Data Model (Core Database)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  2fa_enabled BOOLEAN DEFAULT FALSE
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  docker_network VARCHAR(255) NOT NULL UNIQUE,
  docker_container_id VARCHAR(255),
  docker_container_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_slug ON projects(slug);
```

#### Project Databases Table
```sql
CREATE TABLE project_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  db_name VARCHAR(255) NOT NULL,
  db_password_encrypted VARCHAR(500) NOT NULL,
  db_port INT NOT NULL,
  db_host VARCHAR(255) DEFAULT 'localhost',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Project Domains Table
```sql
CREATE TABLE project_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT FALSE,
  dns_verified BOOLEAN DEFAULT FALSE,
  dns_token VARCHAR(255),
  ssl_cert_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Resource Usage Table
```sql
CREATE TABLE resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Query Logs Table
```sql
CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query_hash VARCHAR(64) NOT NULL,
  executed_by VARCHAR(255),
  executed_at TIMESTAMP DEFAULT NOW(),
  duration_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);
CREATE INDEX idx_query_logs_project_id ON query_logs(project_id);
```

#### Backup History Table
```sql
CREATE TABLE backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  backup_date TIMESTAMP NOT NULL,
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'completed',
  backup_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Email Verification Tokens Table
```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_email_tokens_user_id ON email_verification_tokens(user_id);
```

---

## Technology Stack

### Core Technologies
| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Monorepo** | Turborepo | 2.x | Package management and build orchestration |
| **Package Manager** | pnpm | 9.x | Fast, efficient monorepo package manager |
| **Backend** | Nest.js | 10.x | TypeScript-first, modular API framework |
| **Frontend** | Next.js | 14.x | React meta-framework with SSR |
| **Language** | TypeScript | 5.x | Type-safe development across stack |
| **Database** | PostgreSQL | 16-alpine | Lightweight Docker image |
| **Container** | Docker & Docker Compose | 26.x | Container orchestration |
| **Reverse Proxy** | Traefik | 3.x | Auto-discovering reverse proxy with Let's Encrypt |
| **Authentication** | JWT + Passport.js | - | Stateless authentication |
| **Password Hashing** | bcrypt | 5.x | Industry-standard password hashing |
| **Encryption** | crypto (Node.js) | - | AES-256 for database credentials |
| **Logging** | Winston | 3.x | Structured JSON logging |
| **Testing** | Jest | 29.x | Unit and integration tests |
| **Linting** | ESLint | 8.x | Code quality enforcement |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS framework |
| **UI Components** | shadcn/ui | - | Supabase-style component library |
| **Email** | Nodemailer | 6.x | Email delivery for verification |
| **ORM** | TypeORM | 0.3.x | Database ORM for type-safety |
| **Docker SDK** | Dockerode | 4.x | Node.js Docker API client |
| **DNS** | dns/promises | Node.js built-in | DNS resolution for custom domain validation |
| **Server** | Debian 12 | - | Linux distribution on Hetzner |
| **Backup Storage** | Hetzner Backup Space | - | S3-compatible backup storage |

### Development Tools
- **Code Editor**: VS Code (recommended)
- **Git**: GitHub for version control + CI/CD
- **Databases Client**: pgAdmin (optional for dev) or DBeaver
- **API Testing**: Postman or Thunder Client (VS Code extension)
- **Monitoring (Future)**: Prometheus + Grafana, or ELK Stack

---

## Detailed Phases

### Phase 1: Foundation & Setup (Weeks 1-2)

#### 1.1 Initialize Monorepo
- **Files to create**:
  - Root `package.json` (with workspaces and shared scripts)
  - `turbo.json` (build and test configuration)
  - `pnpm-workspace.yaml` (package manager config)
  - `.gitignore` (exclude node_modules, .env, dist, etc.)
  - `.env.example` (template for required environment variables)
  - `README.md` (project introduction and quick-start)
  
- **Directory structure**:
  ```
  FREEBASE/
  ├── apps/
  │   ├── backend/
  │   └── frontend/
  ├── packages/
  │   ├── shared/
  │   └── types/
  ├── docker/
  │   ├── Dockerfile.backend
  │   ├── Dockerfile.frontend
  │   └── traefik/
  ├── infrastructure/
  │   └── setup.sh
  ├── docs/
  │   ├── ARCHITECTURE.md
  │   ├── API.md
  │   ├── LOCAL_DEV.md
  │   └── DEPLOYMENT.md
  ├── .github/
  │   └── workflows/
  ├── docker-compose.yml
  ├── docker-compose.override.yml
  └── ROADMAP.md
  ```

#### 1.2 GitHub Repository Setup
- Create repo on GitHub
- Set up branch protection (require PR reviews before merge)
- Configure GitHub Secrets for CD (SSH_KEY, HETZNER_TOKEN, DOCKER_REGISTRY_TOKEN)

#### 1.3 Docker Compose for Local Development
- **docker-compose.yml**:
  - Core PostgreSQL (port 5432, volume postgres-core)
  - Traefik (port 80/443, Docker socket, local config)
  - Backend placeholder
  - Frontend placeholder
  - Network: freebase-core
  
- **docker-compose.override.yml**:
  - Hot-reload volumes for backend and frontend
  - Exposed ports for development

#### 1.4 CI/CD Workflow (GitHub Actions)
- **On PR**: Lint (ESLint), Type-check (tsc), Unit tests (Jest)
- **On Merge to main**: Build Docker images, push to ghcr.io
- **On Release Tag**: Auto-deploy to Hetzner (pull images, restart services)

---

### Phase 1B: Backend & Frontend Scaffolding (Week 2)

#### 1B.1 Backend (Nest.js)
- Create `apps/backend/` with `nest new` or manual setup
- Structure:
  ```
  apps/backend/
  ├── src/
  │   ├── main.ts (entry point)
  │   ├── app.module.ts (root module)
  │   ├── auth/ (auth module)
  │   ├── projects/ (projects module)
  │   ├── database/ (database admin module)
  │   ├── domains/ (domain management module)
  │   ├── monitoring/ (storage & monitoring module)
  │   ├── common/ (guards, filters, decorators)
  │   └── config/ (configuration files)
  ├── test/ (test files)
  ├── Dockerfile
  ├── .env.example
  ├── tsconfig.json
  ├── package.json
  └── jest.config.js
  ```

- Key packages: `@nestjs/core`, `@nestjs/common`, `@nestjs/typeorm`, `passport-jwt`, `bcrypt`, `nodemailer`, `dockerode`

#### 1B.2 Frontend (Next.js)
- Create `apps/frontend/` with `create-next-app`
- Structure:
  ```
  apps/frontend/
  ├── app/
  │   ├── layout.tsx (root layout)
  │   ├── page.tsx (index page → redirect to /admin or login)
  │   ├── auth/
  │   │   ├── login/
  │   │   ├── register/
  │   │   └── verify/
  │   ├── admin/
  │   │   ├── layout.tsx
  │   │   ├── page.tsx (dashboard)
  │   │   └── projects/[id]/
  │   │       ├── page.tsx (project detail)
  │   │       └── database/
  │   └── api/
  │       └── (optional: route handlers)
  ├── components/
  │   ├── auth/
  │   ├── layout/
  │   └── database/
  ├── hooks/ (custom React hooks)
  ├── lib/ (utilities, API client)
  ├── styles/ (global CSS)
  ├── .env.example
  ├── tailwind.config.ts
  ├── tsconfig.json
  └── package.json
  ```

- Key packages: `next`, `react`, `typescript`, `tailwindcss`, `shadcn-ui`, `axios` (or `fetch`)

#### 1B.3 Shared Packages
- `packages/types/`: TypeScript types shared between frontend and backend
  - `User`, `Project`, `Domain`, `ResourceUsage`, etc.
- `packages/shared/`: Utilities, constants, validation schemas
  - Zod or Joi for validation schemas (can be used in both)

---

### Phase 2: Authentication (Weeks 2-3)

#### 2.1 Backend Auth Module
- **Files**:
  - `apps/backend/src/auth/auth.service.ts`
  - `apps/backend/src/auth/auth.controller.ts`
  - `apps/backend/src/auth/jwt.strategy.ts`
  - `apps/backend/src/auth/guards/jwt.guard.ts`
  - `apps/backend/src/auth/decorators/current-user.decorator.ts`
  - `apps/backend/src/database/migrations/001_create_users.sql` (TypeORM migrations)

- **Endpoints**:
  - `POST /auth/register` → Create user, send verification email
  - `POST /auth/login` → Validate credentials, return JWT
  - `POST /auth/verify-email?token=xxx` → Verify email, enable account
  - `POST /auth/refresh` → Refresh JWT token
  - `GET /auth/me` → Get current user info
  - `POST /auth/logout` (optional, client-side mainly)

- **Logic**:
  - Password hashing: bcrypt (10 rounds)
  - JWT Secret: from .env
  - Verification tokens: 24h TTL, stored in DB, deleted after use
  - Email: Nodemailer with configured SMTP (e.g., SendGrid, or local relay)

#### 2.2 Frontend Auth Pages
- **Pages**:
  - `/auth/login` → Login form with email/password, "Forgot password?" link, "Sign up" link
  - `/auth/register` → Registration form, password confirmation, accept T&Cs
  - `/auth/verify-email` → Email verification prompt, resend link option
  - `/auth/forgot-password` (MVP: disabled, show "Contact support")

- **Auth Context/Store**:
  - useAuth hook for accessing current user, login/logout functions
  - Store JWT in localStorage (client-side) and HttpOnly cookie (server-side)
  - Auto-redirect to /auth/login if not authenticated

- **Styling**:
  - Copy Supabase Auth UI (centered, card-based, blue/green theme)
  - Responsive design (mobile-first)

#### 2.3 Email Templates
- Create email templates for:
  - Email verification (with link)
  - Password reset (later)
  - Backup completion (later)

---

### Phase 3: Project Management & Docker Orchestration (Weeks 3-4)

#### 3.1 Backend Projects Module
- **Files**:
  - `apps/backend/src/projects/projects.service.ts`
  - `apps/backend/src/projects/projects.controller.ts`
  - `apps/backend/src/projects/docker.service.ts`
  - `apps/backend/src/projects/slug.validator.ts`

- **Endpoints**:
  - `GET /api/v1/projects` → List user's projects
  - `POST /api/v1/projects` → Create new project (trigger Docker provisioning)
  - `GET /api/v1/projects/{id}` → Get project details
  - `PUT /api/v1/projects/{id}` → Update project (name, description)
  - `DELETE /api/v1/projects/{id}` → Hard delete project

- **Docker Service Logic**:
  - Generate project UUID, slug, random port (5433-6100)
  - Create Docker Network: `freebase-project-{slug}`
  - Create PostgreSQL Container:
    - Image: postgres:16-alpine
    - Env: POSTGRES_DB=project_{uuid}, POSTGRES_PASSWORD={random}
    - Resources: 512MB RAM, 1 CPU
    - Volume: project_{uuid}_data
    - Network: freebase-project-{slug}
  - Encrypt DB password, store in Core DB
  - Validate all steps, rollback on error

#### 3.2 Frontend Projects Dashboard
- **Pages**:
  - `/admin` → List all user's projects (card grid)
  - `/admin/new` → Create new project form (name, slug validation)
  - `/admin/projects/{id}` → Project detail page (tabs: Overview, Auth, Database, Domains, Settings)

- **Project Cards**:
  - Show name, slug, standard domain, storage usage (progress bar)
  - Quick action buttons (open, settings, delete)

#### 3.3 Database Migrations (TypeORM)
- Create migration file for projects table
- Run migrations on startup (auto or manual)

---

### Phase 4: PostgreSQL Admin UI (Weeks 4-5)

#### 4.1 Backend Database Admin Service
- **Files**:
  - `apps/backend/src/database/database.service.ts`
  - `apps/backend/src/database/database.controller.ts`
  - `apps/backend/src/database/query.validator.ts`

- **Endpoints**:
  - `GET /api/v1/projects/{id}/db/tables` → List all tables with metadata
  - `GET /api/v1/projects/{id}/db/tables/{table}` → Get table structure + row count
  - `POST /api/v1/projects/{id}/db/query` → Execute SQL query (with validation)
  - `POST /api/v1/projects/{id}/db/import` → Import CSV or SQL file

- **Query Validator**:
  - Whitelist: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX, DROP INDEX
  - Blacklist: DROP DATABASE, TRUNCATE (without LIMIT), dangerous operations
  - Timeout: 30 seconds
  - Result limit: 10MB
  - Max rows: 10,000
  - Log all queries (query_hash, success, duration)

- **Database Connection**:
  - Use pg (node-postgres) with separate pool per project
  - Cache connections (with TTL)
  - Auto-close idle connections

#### 4.2 Frontend Database Pages
- **Layout**: Project detail > Database tab with sub-tabs

- **SQL Editor Tab**:
  - Monaco Editor or CodeMirror with SQL syntax highlighting
  - Execute button, clear button
  - Results table (paginated, sortable, scrollable)
  - Show execution time, rows affected

- **Tables Tab**:
  - List all tables (name, row_count, size_pretty)
  - Click to expand → show columns, types, constraints, indexes
  - Create table button (forms-based or SQL)

- **Data Tab**:
  - Select table from dropdown
  - Inline data editor (table view with inline edit cells)
  - Add row, delete row, bulk actions
  - Filter and sort

- **Import Tab**:
  - File upload (CSV, SQL)
  - For CSV: column mapping, preview
  - Execute import button

#### 4.3 Data Streaming (Large Results)
- Implement Server-Sent Events (SSE) or WebSocket for large query results
- Stream rows as they're fetched (avoid loading full dataset into memory)

---

### Phase 5: Domain Management (Weeks 5-6)

#### 5.1 Standard Domain Routing
- **Traefik Configuration**:
  - Wildcard rule: `Host("{slug}.Neuhauser.network")`
  - Routes to Backend API or Frontend (TBD based on path)

- **Backend**:
  - No specific endpoint needed (Traefik routes automatically)
  - If user visits `{slug}.Neuhauser.network`, redirect to `/admin/projects/{id}`

#### 5.2 Custom Domain Management
- **Endpoints**:
  - `POST /api/v1/projects/{id}/domains` → Create custom domain
    - Generate DNS token
    - Return instruction for user (add TXT record)
  - `POST /api/v1/projects/{id}/domains/{domain}/verify` → Verify DNS
    - Check TXT record with dns/promises
    - If valid, activate in Traefik
    - Request Let's Encrypt cert
  - `GET /api/v1/projects/{id}/domains` → List domains
  - `DELETE /api/v1/projects/{id}/domains/{domain}` → Delete custom domain

- **Frontend**:
  - `/admin/projects/{id}` → Domains section
    - Show standard domain (read-only)
    - Show custom domains (list with status)
    - Add custom domain form
    - Instructions for DNS setup
    - Verify button (after TXT record added)

#### 5.3 Traefik Dynamic Configuration
- Use Traefik File Provider to dynamically load domain configs
- On domain verification, write config file to `docker/traefik/dynamic/{project_id}.yml`
- Traefik auto-reloads on file change
- Let's Encrypt integration: Traefik auto-generates certs (HTTP challenge)

#### 5.4 SSL Certificates
- Traefik stores certs in `docker/traefik/acme.json` (persisted volume)
- Automatic renewal before expiry (Traefik handles)
- No manual intervention needed

---

### Phase 6: Storage Monitoring & Resource Management (Weeks 6-7)

#### 6.1 Storage Monitoring Service
- **Files**:
  - `apps/backend/src/monitoring/storage.service.ts`
  - `apps/backend/src/monitoring/storage.cronjob.ts`

- **Logic**:
  - Cronjob runs daily (2 AM):
    - For each project, query: `SELECT pg_database_size('project_{uuid}') / 1024.0 / 1024.0 as size_mb`
    - Store in `resource_usage` table (storage_bytes, updated_at)
    - If > 900MB: log warning
    - If > 1000MB: set project.storage_exceeded = true

- **Endpoints**:
  - `GET /api/v1/projects/{id}/usage` → Return storage info (bytes, limit, percentage)

- **Frontend**:
  - Dashboard: Show storage usage in project card (progress bar, percentage)
  - Project detail: Show full storage usage chart
  - If exceeded: Warning banner "Storage limit reached"

#### 6.2 1GB Hard Limit Enforcement
- **Middleware** in Backend:
  - Before INSERT, UPDATE, DELETE → check resource_usage
  - If >= 1000MB → reject with HTTP 507 "Insufficient Storage"
  - Exception: Allow DELETE to free space, allow SELECT

#### 6.3 Automatic Backups (Hetzner Backup Space)
- **Files**:
  - `apps/backend/src/backup/backup.service.ts`
  - `apps/backend/src/backup/backup.cronjob.ts`

- **Logic**:
  - Cronjob runs daily (3 AM):
    - For each project, run: `pg_dump project_{uuid} | gzip > /tmp/backup_{uuid}_{timestamp}.sql.gz`
    - Upload to Hetzner Backup Space (S3-compatible, via AWS SDK)
    - Record in `backup_history` table (backup_date, size_bytes, status, backup_url)
    - Keep only last 7 days locally (prune older)

- **Endpoints**:
  - `POST /api/v1/projects/{id}/backups/manual` → Trigger manual backup
  - `GET /api/v1/projects/{id}/backups` → List available backups

- **Frontend**:
  - Project detail > Settings tab: Show backup history (list of backups, download button, manual backup button)

- **Credentials**:
  - Hetzner Backup Space credentials in .env (not in code)
  - Use environment variables for S3 endpoint, access key, secret key

---

### Phase 7: Security, Encryption & Network Isolation (Weeks 6-7)

#### 7.1 Credentials Encryption (AES-256)
- **Files**:
  - `apps/backend/src/common/encryption.service.ts`

- **Logic**:
  - Master encryption key in .env (32 bytes, random)
  - Generate random IV for each encryption
  - Encrypt: plaintext → IV + AES-256 → base64
  - Decrypt: base64 → IV + AES-256 → plaintext

- **Apply to**:
  - `project_databases.db_password_encrypted` (encrypt on creation, decrypt when connecting)
  - All future API keys and secrets

#### 7.2 Network Isolation (Docker)
- Each project has its own network: `freebase-project-{slug}`
- Containers can't reach other projects' networks
- Backend enforces auth checks: only user who owns project can access its DB

#### 7.3 TLS Between Services
- Local dev: Traefik uses self-signed certs (HTTP challenge disabled)
- Production: Let's Encrypt HTTP challenge enabled
- Internal Docker network: no TLS needed (private network)

#### 7.4 Secrets Management
- Local: `.env` file (in .gitignore, not committed)
- Production: `.env.production` manually created on server (not in git)
- GitHub Actions: Uses GitHub Secrets for sensitive data (SSH key, tokens)
- No secrets in docker-compose files

#### 7.5 Secrets in Code
- All secrets loaded from environment variables
- No hardcoded secrets anywhere
- Use dotenv package to load .env files in development

---

### Phase 8: Project Deletion & Hard Delete (Week 7)

#### 8.1 Hard Delete Implementation
- **Endpoint**: `DELETE /api/v1/projects/{id}`
  1. Verify ownership (JWT user_id == project.user_id)
  2. Kill Docker Container: `docker stop freebase-project-{slug}-postgres`
  3. Remove Docker Container: `docker rm freebase-project-{slug}-postgres`
  4. Remove Docker Network: `docker network rm freebase-project-{slug}`
  5. Drop Project Database: `DROP DATABASE project_{uuid}`
  6. Archive last backup to Hetzner (optional)
  7. Delete from Core DB (cascade deletes all related records)
  8. Return 204 No Content

- **Error Handling**:
  - If Docker operation fails, retry with exponential backoff
  - If DB drop fails, log error and alert admin
  - Transaction-like behavior (rollback on any failure)

#### 8.2 Frontend Confirmation
- `/admin/projects/{id}` > Settings tab > Delete project section
- Show confirmation dialog: "This will permanently delete the project and all data. Are you sure?"
- Require entering project name as confirmation
- Disable button for 3 seconds after click

---

### Phase 9: Logging & Monitoring (Week 7)

#### 9.1 Structured Logging (Winston)
- **Files**:
  - `apps/backend/src/common/logger.service.ts`

- **Levels**: INFO, WARN, ERROR
- **Format**: JSON (timestamp, level, module, message, user_id, context)
- **Transports**:
  - Console (dev)
  - File (prod) → `/var/log/freebase/*.log`
- **Rotation**: Daily log rotation (keep 7 days)

#### 9.2 Query Logging
- All SQL queries logged to `query_logs` table (hashed)
- Used for audit trail, debugging, performance analysis
- Not logged: password values, sensitive data

#### 9.3 Error Tracking & Alerts
- All ERROR logs trigger email alert (configurable recipients)
- Error context included: user_id, project_id, stack trace
- Alert sent via Nodemailer (configured SMTP)

#### 9.4 Monitoring Dashboards (Optional for MVP, Document for Later)
- Prometheus (metrics collection)
- Grafana (visualization)
- Alert rules (CPU, memory, disk usage)
- Logging aggregation (ELK or Loki)

---

### Phase 10: Deployment & Production Setup (Week 8)

#### 10.1 Server Setup Script
- **File**: `infrastructure/setup.sh`
- **Steps**:
  1. Install Docker and Docker Compose
  2. Install Node.js (for potential future services)
  3. Clone GitHub repo
  4. Create .env.production (with real secrets)
  5. Create SSL/TLS certificates directory
  6. Create log directories
  7. Pull Docker images
  8. Run migrations on Core DB
  9. Start docker-compose.production.yml
  10. Verify services are healthy

#### 10.2 Production Docker Compose
- **File**: `docker-compose.production.yml`
  - Remove hot-reload volumes
  - Add resource limits (500MB RAM, 1 CPU)
  - Add health checks (curl, pg_isready, etc.)
  - Add restart policies (unless-stopped)
  - Set LOG_LEVEL=WARN
  - Use environment file: .env.production
  - Disable debug endpoints

#### 10.3 DNS Setup (Neuhauser.network)
- Hetzner DNS Console:
  - `Neuhauser.network` A record → Server IP
  - `*.Neuhauser.network` A record → Server IP (wildcard)
  - `api.Neuhauser.network` (optional, if different routing needed)
  - MX records (if email needed)

#### 10.4 Backup Strategy
- Daily automated backups to Hetzner Backup Space
- Retention: 7 days
- Manual backup endpoint available
- Test restore process before production launch

#### 10.5 GitHub Actions Deploy Workflow
- **On release tag (v1.0.0)**:
  1. Build Docker images (backend, frontend)
  2. Tag images with version
  3. Push to ghcr.io (GitHub Container Registry)
  4. SSH into Hetzner server
  5. Pull latest images
  6. Run migrations (if any)
  7. Run docker-compose -f docker-compose.production.yml pull
  8. Run docker-compose -f docker-compose.production.yml up -d
  9. Verify services are healthy
  10. Slack/email notification on success/failure

#### 10.6 SSL Certificates (Let's Encrypt)
- Traefik auto-generates certs on first HTTPS request (HTTP challenge)
- Certs stored in docker/traefik/acme.json (persisted volume)
- Auto-renewal (30 days before expiry)
- No manual intervention needed

---

### Phase 11: MVP Testing & Launch (Week 8+)

#### 11.1 MVP Acceptance Criteria
- ✅ User registration + email verification + login works
- ✅ Project creation → auto-provision Docker container + PostgreSQL
- ✅ Standard domain `{slug}.Neuhauser.network` accessible (404 or admin redirect)
- ✅ SQL Query Editor → write & execute queries (with validation)
- ✅ Table Browser → list tables, columns, indexes
- ✅ Data Editor → inline edit, add row, delete row
- ✅ CSV/SQL import works
- ✅ Custom domain → DNS validation → routes correctly
- ✅ Storage monitoring + 1GB hard limit enforced
- ✅ Daily backups to Hetzner (verifiable, can download)
- ✅ Project deletion → hard delete (docker cleanup, DB drop)
- ✅ Multi-project isolation confirmed (separate networks, no cross-project access)
- ✅ Error handling & detailed error messages
- ✅ Logs accessible for debugging
- ✅ Performance acceptable (query execution < 30s)
- ✅ UI/UX matches Supabase design

#### 11.2 Testing Checklist
- **Unit Tests**: Auth, Projects, Database services (target 80%+ coverage)
- **Integration Tests**: Auth flow, Project creation, Query execution
- **E2E Tests** (optional): User journey (register → create project → query → delete)
- **Load Tests** (optional): Simulate multiple concurrent users
- **Security Tests**: SQL injection, XSS, CSRF, auth bypass

#### 11.3 Documentation
- Create/update docs:
  - `docs/ARCHITECTURE.md` → System design, data flow diagrams
  - `docs/API.md` → Endpoint documentation (request/response examples)
  - `docs/LOCAL_DEV.md` → How to run locally (setup, hot-reload, debugging)
  - `docs/DEPLOYMENT.md` → Server setup, monitoring, troubleshooting, backup/restore
  - `docs/SECURITY.md` → Security considerations, encryption, backup strategy
  - `README.md` → Quick overview, tech stack, roadmap

---

### Phase 12: Post-MVP Features (Future)

These features are documented for planning but not included in MVP:

#### 12.1 OAuth Authentication
- Google OAuth (sign up / login via Google)
- Apple Sign-In
- GitHub OAuth (for developers)
- Implementation: Passport.js strategies + frontend buttons

#### 12.2 Project-Level API (v1)
- Each project exposes REST API on its custom domain
- Authentication: Project API key (separate from user JWT)
- Endpoints:
  - `GET /{slug}/api/v1/tables` → list tables
  - `GET /{slug}/api/v1/tables/{table}` → query table
  - `POST /{slug}/api/v1/tables/{table}` → insert row
  - `PATCH /{slug}/api/v1/tables/{table}/{id}` → update row
  - `DELETE /{slug}/api/v1/tables/{table}/{id}` → delete row
- Documentation: OpenAPI/Swagger spec

#### 12.3 Teams & Collaboration
- Team management: invite users, set roles (admin, editor, viewer)
- Shared projects: multiple users per project
- Audit log: track who did what and when
- Tables: teams, team_members, roles

#### 12.4 Advanced Database Features
- Views: create and manage SQL views
- Stored procedures: create PL/pgSQL functions
- Triggers: create and manage triggers
- Extensions: enable PostgreSQL extensions (PostGIS, etc.)

#### 12.5 API Keys & Authentication
- Project API keys: for accessing project REST API
- Scoped permissions: limit what each key can do (read-only, write, etc.)
- Key rotation: expire and generate new keys

#### 12.6 Realtime Features (WebSocket)
- Subscribe to table changes (insert, update, delete)
- Broadcast changes to connected clients
- Use Socket.io or native WebSocket

#### 12.7 Rate Limiting
- Per-user rate limits (API requests, queries)
- Per-project rate limits (storage, queries)
- Implement with node-rate-limiter

#### 12.8 Billing & Quotas
- Freemium model: free tier (1 project, 100MB storage) + paid tiers
- Stripe integration for payments
- Usage tracking and quota enforcement
- Upgrade/downgrade management

#### 12.9 Backup & Restore
- Manual restore from backup endpoint
- Point-in-time recovery (PITR)
- Automated backup schedule (configurable)
- Backup retention policies

#### 12.10 Advanced SQL Features
- Query optimization suggestions
- Execution plans (EXPLAIN ANALYZE)
- Slow query detection and alerts
- Query history and favorites

---

## Development Timeline

### Week 1-2: Foundation
- [ ] Monorepo setup (turbo, pnpm, structure)
- [ ] Docker compose (local dev environment)
- [ ] GitHub repo and CI/CD workflows
- [ ] Backend + Frontend scaffolding

### Week 2-3: Authentication
- [ ] Auth module (register, login, verify email)
- [ ] Auth pages (frontend)
- [ ] Email verification flow

### Week 3-4: Project Management
- [ ] Projects CRUD API
- [ ] Docker automation (create container, network, DB)
- [ ] Project dashboard (frontend)

### Week 4-5: Database Admin UI
- [ ] SQL query executor (backend + frontend)
- [ ] Table browser (backend + frontend)
- [ ] Data editor (backend + frontend)
- [ ] CSV/SQL import

### Week 5-6: Domain Management
- [ ] Standard domain routing (Traefik config)
- [ ] Custom domain verification (DNS validation)
- [ ] SSL certificates (Let's Encrypt)

### Week 6-7: Monitoring & Security
- [ ] Storage monitoring + 1GB enforcement
- [ ] Backups to Hetzner
- [ ] Encryption (AES-256 for credentials)
- [ ] Logging (Winston, structured logs)

### Week 7-8: Deployment & Testing
- [ ] Server setup script
- [ ] Production docker-compose
- [ ] GitHub Actions deploy workflow
- [ ] MVP testing and bug fixes
- [ ] Documentation

### Week 8+: Launch & Post-MVP
- [ ] Launch to production
- [ ] Monitor and support
- [ ] Start planning Phase 2 (OAuth, API, Teams, etc.)

---

## Deployment Instructions

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/freebase.git
   cd freebase
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Create .env File**
   ```bash
   cp .env.example .env
   # Edit .env with your local config
   ```

4. **Start Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Run Migrations**
   ```bash
   pnpm backend db:migrate
   ```

6. **Start Development**
   ```bash
   pnpm dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Traefik Dashboard: http://localhost:8080
   - PostgreSQL: localhost:5432

### Production Deployment (Hetzner)

1. **Server Prerequisites**
   - Debian 12 VPS at Hetzner
   - SSH access
   - Neuhauser.network domain DNS configured

2. **Run Setup Script**
   ```bash
   ssh root@<server-ip>
   cd /opt
   git clone https://github.com/yourusername/freebase.git
   cd freebase
   chmod +x infrastructure/setup.sh
   ./infrastructure/setup.sh
   ```

3. **Create .env.production**
   ```bash
   # On server
   nano .env.production
   # Add all production secrets (JWT_SECRET, DB_PASSWORD, ENCRYPTION_KEY, etc.)
   ```

4. **Start Services**
   ```bash
   docker-compose -f docker-compose.production.yml pull
   docker-compose -f docker-compose.production.yml up -d
   ```

5. **Verify Services**
   ```bash
   docker-compose ps
   docker-compose logs -f backend
   ```

6. **Test**
   - https://Neuhauser.network → should load frontend
   - https://Neuhauser.network/api/v1/health → should return 200

### GitHub Actions Deploy

1. **Create Release Tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Workflow Automatically**:
   - Builds Docker images
   - Pushes to ghcr.io
   - Deploys to Hetzner server
   - Verifies services

---

## API Version Strategy

### v1 (Current/MVP)
- All endpoints at `/api/v1/`
- Core features: Auth, Projects, Database Admin, Domains

### v2 (Future)
- Breaking changes: different response format, different auth
- Keep v1 alive for backward compatibility
- Clients can opt-in to v2

### Versioning Headers (Optional)
```
GET /api/v1/projects
GET /api/projects (defaults to v1)
```

---

## Error Handling & Detailed Messages

All errors return structured JSON with detailed messages:

```json
{
  "statusCode": 400,
  "message": "Email is already registered",
  "error": "BAD_REQUEST",
  "timestamp": "2026-02-01T10:30:00Z",
  "path": "/auth/register",
  "details": {
    "field": "email",
    "constraint": "UNIQUE",
    "value": "user@example.com"
  }
}
```

Error messages are detailed (for debugging) but also user-friendly (shown in frontend).

---

## Performance Targets

- **Page Load**: < 2 seconds (frontend)
- **API Response**: < 500ms (95th percentile)
- **Query Execution**: < 30 seconds
- **Database Backup**: < 5 minutes (per GB of data)
- **Project Creation**: < 10 seconds

---

## Security Checklist

- [ ] All passwords hashed (bcrypt)
- [ ] JWTs signed with secret from .env
- [ ] Database credentials encrypted (AES-256)
- [ ] No secrets in code or docker-compose files
- [ ] SQL injection validation (whitelist queries)
- [ ] XSS protection (React, sanitize inputs)
- [ ] CSRF protection (SameSite cookies)
- [ ] CORS configured (frontend domain only)
- [ ] Rate limiting on auth endpoints
- [ ] TLS 1.2+ between services
- [ ] Network isolation (Docker networks)
- [ ] Audit logging (query logs, user actions)
- [ ] Regular backups (daily, tested)
- [ ] Dependency scanning (Dependabot)

---

## Monitoring & Alerts

### Health Checks
- Backend: `GET /health` → returns 200 if healthy
- Frontend: Check if loads without errors
- PostgreSQL: `pg_isready` check
- Traefik: Dashboard at /dashboard

### Metrics to Monitor
- CPU usage (per container)
- Memory usage (per container)
- Disk usage (especially project databases)
- Network I/O (egress for backups)
- Query performance (slow queries)
- Error rates (4xx, 5xx)

### Alerts
- Disk space > 80% → email alert
- Project storage > 900MB → warning banner in UI
- Error rate > 1% → email alert
- Service down → email alert
- Backup failure → email alert

---

## File Structure Summary

```
FREEBASE/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── database/
│   │   │   ├── domains/
│   │   │   ├── monitoring/
│   │   │   ├── backup/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   └── frontend/
│       ├── app/
│       │   ├── auth/
│       │   ├── admin/
│       │   └── api/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── styles/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       └── next.config.js
├── packages/
│   ├── types/
│   │   └── src/
│   │       ├── user.ts
│   │       ├── project.ts
│   │       ├── domain.ts
│   │       └── index.ts
│   └── shared/
│       └── src/
│           ├── validators/
│           ├── constants/
│           └── utils/
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── traefik/
│       ├── traefik.yml
│       └── dynamic/
├── infrastructure/
│   ├── setup.sh
│   └── Dockerfile.migration (for running migrations)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── LOCAL_DEV.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── TROUBLESHOOTING.md
├── .github/
│   └── workflows/
│       ├── ci.yml (lint, test)
│       ├── build.yml (build docker images)
│       └── deploy.yml (deploy to hetzner)
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.production.yml
├── package.json (root)
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── README.md
└── ROADMAP.md
```

---

## Quick Reference

### Environment Variables (Root)
- `JWT_SECRET` → Secret for signing JWT tokens
- `JWT_EXPIRY` → Token expiry time (24h default)
- `ENCRYPTION_KEY` → 32-byte key for AES-256 encryption
- `DB_HOST` → Core PostgreSQL host
- `DB_PORT` → Core PostgreSQL port
- `DB_USER` → Core PostgreSQL user
- `DB_PASSWORD` → Core PostgreSQL password
- `DB_NAME` → Core PostgreSQL database name
- `DOCKER_HOST` → Docker socket (usually /var/run/docker.sock)
- `SMTP_HOST` → Email SMTP host
- `SMTP_PORT` → Email SMTP port
- `SMTP_USER` → Email SMTP user
- `SMTP_PASS` → Email SMTP password
- `HETZNER_BACKUP_ENDPOINT` → S3 endpoint for Hetzner Backup Space
- `HETZNER_BACKUP_KEY` → S3 access key
- `HETZNER_BACKUP_SECRET` → S3 secret key
- `HETZNER_BACKUP_BUCKET` → S3 bucket name
- `LOG_LEVEL` → INFO (dev) or WARN (prod)
- `NODE_ENV` → development or production
- `FRONTEND_URL` → Frontend domain (Neuhauser.network)
- `API_URL` → Backend API URL (api.Neuhauser.network)

### Useful Commands
```bash
# Local development
pnpm install              # Install dependencies
pnpm dev                  # Start dev servers
docker-compose ps         # Check running services
docker-compose logs -f    # View logs

# Database
pnpm backend db:migrate   # Run migrations
pnpm backend db:seed      # Seed test data (optional)
docker exec <db-container> psql -U postgres -d freebase # Connect to core DB

# Testing
pnpm test                 # Run all tests
pnpm backend test         # Backend tests only
pnpm frontend test        # Frontend tests only

# Production
docker-compose -f docker-compose.production.yml up -d     # Start services
docker-compose -f docker-compose.production.yml logs -f    # View logs
docker-compose exec backend npm run db:migrate             # Run migrations
```

---

## Notes for Developers

1. **Always test locally before pushing** → use `docker-compose up`
2. **Use meaningful commit messages** → enables good git history
3. **Write tests as you code** → improves quality and confidence
4. **Document API changes** → keep docs/API.md updated
5. **Use TypeScript strictly** → `strict: true` in tsconfig.json
6. **No console.logs in production code** → use Winston logger
7. **Validate all user input** → server-side always
8. **Handle errors gracefully** → never expose stack traces to users
9. **Use environment variables for secrets** → never hardcode
10. **Review security checklist** before launch → don't skip!

---

**Last Updated**: February 1, 2026  
**Status**: Ready for Implementation  
**Next Step**: Initialize monorepo and GitHub repository

