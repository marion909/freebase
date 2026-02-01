# System Architecture

## Overview

Freebase is a multi-tenant platform that allows users to create isolated projects with their own PostgreSQL databases and Docker containers. The architecture focuses on isolation, security, and scalability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet/Users                            │
└────────────────┬────────────────────────────────────┬────────────┘
                 │                                    │
         ┌───────▼──────────┐            ┌────────────▼──────────┐
         │  Standard Domain │            │   Custom Domains      │
         │ {slug}.          │            │  (user-provided)      │
         │ Neuhauser.network  │            │  myapp.com            │
         └───────┬──────────┘            └────────────┬──────────┘
                 │                                    │
         ┌───────▼────────────────────────────────────▼─────────┐
         │           Traefik (Reverse Proxy)                    │
         │    Port 80/443, Let's Encrypt SSL/TLS               │
         │  Path-based & Host-based routing                     │
         └───────┬────────────────────────────────────┬─────────┘
                 │                                    │
     ┌───────────▼──────────┐              ┌─────────▼────────────┐
     │    /api/v1/* routes  │              │  / (frontend routes) │
     │    (API requests)    │              │  (UI requests)       │
     └───────────┬──────────┘              └─────────┬────────────┘
                 │                                   │
         ┌───────▼──────────────────────────────────▼──────────┐
         │   Docker Network: freebase-core                     │
         │  (Core infrastructure services)                     │
         │                                                     │
         │  ┌──────────────┐  ┌──────────┐  ┌────────────┐   │
         │  │  Backend     │  │Frontend  │  │PostgreSQL  │   │
         │  │  (Nest.js)   │  │(Next.js) │  │(Core DB)   │   │
         │  │  Port 3001   │  │Port 3000 │  │Port 5432   │   │
         │  └──────────────┘  └──────────┘  └────────────┘   │
         └──────────────────────────────────────────────────────┘
                 │                    │
      ┌──────────▼──────┬──────────────▼──────────────┬───────────┐
      │                 │                            │           │
   ┌──▼──────┐    ┌────▼────┐                  ┌────▼──────┐    │
   │ Docker  │    │Docker   │    ...           │Docker     │    │
   │Network: │    │Network: │                  │Network:   │    │
   │freebase-│    │freebase-│                  │freebase-  │    │
   │project- │    │project- │                  │project-   │    │
   │app1     │    │app2     │                  │appN       │    │
   │         │    │         │                  │           │    │
   │ ┌─────┐ │    │ ┌─────┐ │                  │ ┌─────┐   │    │
   │ │PG   │ │    │ │PG   │ │                  │ │PG   │   │    │
   │ │5433 │ │    │ │5434 │ │                  │ │544X │   │    │
   │ └─────┘ │    │ └─────┘ │                  │ └─────┘   │    │
   │         │    │         │                  │           │    │
   └─────────┘    └─────────┘                  └───────────┘    │
      │               │                            │              │
      │               │                            │              │
      └───────────────┼────────────────────────────┘              │
                      │                                           │
              ┌───────▼──────────┐                                │
              │ Hetzner Backup   │ (Daily automated backups)      │
              │ Space (S3)       │                                │
              └──────────────────┘                                │
```

## Core Components

### 1. Traefik Reverse Proxy
- **Role**: Route incoming requests to correct services based on domain and path
- **Features**:
  - Automatic SSL/TLS certificates (Let's Encrypt)
  - Path-based routing (`/api/v1/*` → Backend)
  - Host-based routing (`Neuhauser.network` → Frontend, `*.Neuhauser.network` → API)
  - Custom domain support with DNS validation
  - HTTPS redirect, gzip compression, security headers

### 2. Backend (Nest.js)
- **Role**: API server handling business logic
- **Responsibilities**:
  - User authentication (Email/PW, JWT)
  - Project CRUD operations
  - Docker container provisioning
  - Database admin API (SQL queries, table browsing, data editing)
  - Domain management
  - Storage monitoring and backups
  - Error logging and request tracking

### 3. Frontend (Next.js)
- **Role**: User dashboard and UI
- **Pages**:
  - Authentication (login, register, email verification)
  - Projects dashboard
  - Project detail (Overview, Database, Domains, Settings)
  - Database admin (SQL Editor, Table Browser, Data Editor, Import)

### 4. Core PostgreSQL Database
- **Role**: Store all metadata and configuration
- **Tables**:
  - `users` - User accounts
  - `projects` - Project metadata
  - `project_databases` - DB connection info per project
  - `project_domains` - Domain mappings
  - `resource_usage` - Storage tracking
  - `query_logs` - Audit trail
  - `backup_history` - Backup records
  - `email_verification_tokens` - Email verification

### 5. Project-Specific Databases
- **Role**: Store project data (user-created)
- **Isolation**: Each project has:
  - Separate PostgreSQL container
  - Private Docker network
  - Unique port (5433-6100)
  - Separate backups

## Data Flow

### User Registration & Login
```
1. User visits Neuhauser.network
2. Traefik routes to Frontend
3. User clicks "Sign Up"
4. Frontend → POST /api/v1/auth/register
5. Backend validates input, hashes password
6. Backend creates user record, sends verification email
7. User clicks email link
8. Frontend → POST /api/v1/auth/verify-email?token=xxx
9. Backend validates token, marks email verified
10. User → login with email/password
11. Backend → returns JWT token
12. Frontend stores JWT, redirects to dashboard
```

### Project Creation
```
1. User clicks "Create Project"
2. Frontend → POST /api/v1/projects
3. Backend:
   a. Validates slug uniqueness
   b. Generates UUID, random port (5433-6100)
   c. Creates Docker network: freebase-project-{slug}
   d. Creates PostgreSQL container in that network
   e. Encrypts DB password (AES-256)
   f. Saves project metadata in Core DB
4. Frontend receives project details
5. Redirects to /admin/projects/{id}
```

### SQL Query Execution
```
1. User writes SQL in Database tab
2. Frontend → POST /api/v1/projects/{id}/db/query
3. Backend:
   a. Validates JWT token
   b. Fetches project (checks user ownership)
   c. Validates SQL query (whitelist, timeout, size limits)
   d. Retrieves encrypted DB credentials from Core DB
   e. Decrypts password
   f. Creates connection to project-specific DB
   g. Executes query (with 30s timeout)
   h. Logs query hash + metadata to query_logs table
   i. Returns results to Frontend
4. Frontend displays results in table format
```

### Custom Domain Verification
```
1. User adds custom domain "myapp.com"
2. Frontend → POST /api/v1/projects/{id}/domains
3. Backend:
   a. Generates random DNS token
   b. Stores in project_domains table
   c. Returns instruction to user
4. User adds DNS TXT record: freebase-verify-{token}
5. User clicks "Verify"
6. Frontend → POST /api/v1/projects/{id}/domains/verify
7. Backend:
   a. Queries DNS for TXT record
   b. If found, marks dns_verified = true
   c. Traefik loads dynamic config for new domain
   d. Let's Encrypt generates certificate
8. myapp.com now routes to project
```

### Backup Process
```
1. Daily at 3 AM: Backend cronjob runs
2. For each project:
   a. Run: pg_dump project_{uuid} | gzip > backup.sql.gz
   b. Calculate file size
   c. Upload to Hetzner Backup Space (S3-compatible)
   d. Store backup URL + metadata in backup_history
   e. Delete local backups older than 7 days
3. Users can manually trigger backup via API
4. Users can download backups from Frontend
```

## Security Model

### Network Isolation
- Each project has isolated Docker network
- Projects cannot reach other projects' containers
- Only project's own PostgreSQL visible within network
- Backend must authenticate user before accessing project DB

### Encryption
- Database credentials encrypted with AES-256 (master key from .env)
- All API communication over HTTPS (Let's Encrypt certs)
- JWT tokens signed with secret (never sent to frontend)
- Passwords hashed with bcrypt (10 rounds)

### Authentication & Authorization
- JWT tokens with 24h expiry
- Refresh tokens for longer sessions (7d)
- All endpoints require JWT unless public (auth routes)
- User ownership validation for project access
- Query validation prevents SQL injection

### Logging & Audit
- All SQL queries logged (query hash, not sensitive data)
- User actions logged (login, project creation, domain changes)
- Error logs include context (user_id, project_id, timestamp)
- Logs stored in `query_logs` and Winston logs

### Backups & Recovery
- Daily automated backups to Hetzner (off-site)
- 7-day retention policy
- Tested backup restore process
- No backup data deleted until 7 days old

## Deployment

### Local Development
- Docker Compose with hot-reload volumes
- All services in single `freebase-core` network
- Development secrets in `.env` (git-ignored)

### Production
- Single Debian server at Hetzner
- Docker Compose with resource limits
- Production secrets in `.env.production` (not git-tracked)
- Traefik with Let's Encrypt for real domains
- Automated GitHub Actions deployment on release tags
- Health checks on all containers
- Log rotation and aggregation

## Scalability

### Current (MVP)
- Single server setup
- Can handle ~100-1000 projects depending on load
- PostgreSQL containers limited to 512MB RAM each

### Future Improvements
- Kubernetes migration for container orchestration
- Distributed database backends
- Load balancing across multiple servers
- Caching layer (Redis)
- Advanced monitoring (Prometheus, Grafana)
- Multi-region backup strategy

## Performance Considerations

### Database
- Core DB: indexes on `user_id`, `project_id`, `slug`
- Query logs: indexes for efficient audit trails
- Connection pooling: separate pools per project DB

### API Response Times
- Target: < 500ms (95th percentile)
- Caching: project metadata cached in memory
- Streaming: large query results streamed to reduce memory

### Frontend Performance
- Next.js static generation for auth pages
- Client-side caching of project metadata
- Lazy loading of heavy components (SQL Editor, Tables)

## Error Handling

### Validation
- Input validation at API layer (Zod schemas)
- SQL query validation (whitelist, timeout)
- Email/slug uniqueness checks

### User-Friendly Errors
- Detailed error messages in responses
- Stack traces excluded in production
- Frontend displays user-friendly messages
- Server logs include full context for debugging

## Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Backend liveness probe
- `GET /health/ready` - Backend readiness probe
- Docker health checks on all containers

### Metrics to Monitor
- CPU/Memory usage per container
- PostgreSQL connection count
- Request latency (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database query performance
- Disk space usage (especially backups)

## Configuration Management

### Environment Variables
- Core config in `.env` (local) or `.env.production` (prod)
- All secrets loaded from environment (never in code)
- Docker Compose uses `env_file` to load variables

### Secrets
- JWT_SECRET: 32+ character random key
- ENCRYPTION_KEY: 32-byte hex for AES-256
- DB_PASSWORD: Strong password for Core DB
- SMTP credentials: For email delivery
- Hetzner Backup credentials: For backup uploads

## Future Enhancements

1. **Project-Level API**: Expose REST API per project (v1)
2. **OAuth**: Google, Apple, GitHub authentication
3. **Teams**: Multiple users per project with roles
4. **Advanced SQL**: Views, triggers, procedures, extensions
5. **Realtime**: WebSocket subscriptions to table changes
6. **Rate Limiting**: Quota enforcement per project
7. **Billing**: Freemium model with paid upgrades
8. **Analytics**: Query performance tracking, slow query alerts

---

**Last Updated**: February 2026
