# Local Development Guide

This guide will help you set up and run Freebase locally for development.

## Prerequisites

- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **pnpm 9+** - Install with `npm install -g pnpm`
- **Docker & Docker Compose** - Download from [docker.com](https://docker.com)
- **Git** - For version control

Verify installation:
```bash
node --version    # Should be v20+
pnpm --version    # Should be 9+
docker --version  # Should be 24+
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/freebase.git
cd freebase
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for the monorepo (backend, frontend, and shared packages).

### 3. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and customize as needed:
```env
NODE_ENV=development
LOG_LEVEL=INFO
JWT_SECRET=your-super-secret-key-min-32-chars!!!
ENCRYPTION_KEY=your-32-byte-hex-key
SMTP_HOST=localhost  # For development, you can use a local mail server or skip emails
# ... other config
```

### 4. Start Docker Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (Core DB) on port 5432
- **Traefik** (Reverse Proxy) on ports 80, 443, 8080
- **Backend** placeholder (will start manually)
- **Frontend** placeholder (will start manually)

Verify services are running:
```bash
docker-compose ps
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

This creates the Core database schema (users, projects, domains, etc.).

### 6. Start Development Servers

```bash
pnpm dev
```

This starts both backend and frontend in watch mode:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api
- **Traefik Dashboard**: http://localhost:8080

---

## Development Workflow

### Working on the Backend

```bash
# Start only backend in watch mode
pnpm dev --filter=backend

# Run backend tests
pnpm test --filter=backend

# Run backend tests in watch mode
pnpm test:watch --filter=backend

# Check types
pnpm type-check --filter=backend

# Lint and fix
pnpm lint --filter=backend
```

The backend automatically reloads when you make changes to `apps/backend/src/**`.

### Working on the Frontend

```bash
# Start only frontend in watch mode
pnpm dev --filter=frontend

# Build frontend
pnpm build --filter=frontend

# Run frontend tests
pnpm test --filter=frontend

# Check types
pnpm type-check --filter=frontend

# Lint and fix
pnpm lint --filter=frontend
```

The frontend uses Next.js Fast Refresh for instant hot-reload.

### Working on Shared Packages

```bash
# Type-check shared packages
pnpm type-check --filter=@freebase/types --filter=@freebase/shared

# Lint shared packages
pnpm lint --filter=@freebase/shared
```

### Database Operations

```bash
# Run pending migrations
pnpm db:migrate

# Generate a new migration from entity changes
pnpm db:generate

# Seed test data (if available)
pnpm db:seed

# Connect to Core DB directly
docker exec -it freebase-postgres psql -U postgres -d freebase
```

---

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test -- --coverage
```

### Test Specific Package

```bash
pnpm test --filter=backend
pnpm test --filter=frontend
```

---

## MVP Testing Checklist

Use this checklist to validate core MVP flows before release:

- [ ] User registration, email verification, and login
- [ ] Project creation provisions Docker container and DB
- [ ] Standard domain `{slug}.Neuhauser.network` resolves
- [ ] SQL Editor executes queries with validation
- [ ] Table Browser lists tables and columns
- [ ] Data Editor can edit, add, delete rows
- [ ] CSV/SQL import works end-to-end
- [ ] Custom domain DNS verification works
- [ ] Storage usage endpoint returns values
- [ ] Storage warning banners display correctly
- [ ] Project deletion removes container, network, and DB
- [ ] `/health` endpoint returns 200
- [ ] Logs written and error alerts configured

---

## Code Quality

### Linting

```bash
# Check linting issues
pnpm lint

# Fix linting issues automatically
pnpm lint:fix
```

### Type Checking

```bash
# Check TypeScript types across all packages
pnpm type-check
```

### Formatting

```bash
# Format code with Prettier (configured in packages)
pnpm prettier --write "."
```

---

## Debugging

### Backend Debugging

1. Start backend with debugger:
   ```bash
   node --inspect-brk dist/main
   ```

2. Open Chrome DevTools:
   - Navigate to `chrome://inspect`
   - Click "Inspect" on the Node process

3. Set breakpoints and step through code

### Frontend Debugging

1. Open browser DevTools (F12)
2. Use React DevTools extension
3. Use Next.js debugging in browser

### Docker Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# View logs for a specific number of lines
docker-compose logs --tail=100 backend
```

---

## Database Management

### Connect to Core Database

```bash
# Via Docker
docker exec -it freebase-postgres psql -U postgres -d freebase

# Via local PostgreSQL client (if installed)
psql -h localhost -U postgres -d freebase
```

### Useful PostgreSQL Queries

```sql
-- List all tables
\dt

-- Describe a table
\d users

-- View user count
SELECT COUNT(*) FROM users;

-- View project count
SELECT COUNT(*) FROM projects;

-- Clear test data
TRUNCATE users CASCADE;
```

### Creating a New Database Migration

```bash
pnpm db:generate -- src/migrations/AddNewFeature
```

This generates a migration file based on entity changes. Edit it if needed, then apply:

```bash
pnpm db:migrate
```

---

## Common Issues

### Port Already in Use

If you get "port X is already in use":

```bash
# Find and kill process on port
# On Windows PowerShell:
Get-Process | Where-Object {$_.Handles -match 3000} | Stop-Process

# On macOS/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Docker Container Issues

```bash
# View container logs
docker-compose logs <service-name>

# Restart a service
docker-compose restart <service-name>

# Rebuild Docker image
docker-compose build <service-name>

# Full reset (removes volumes - DESTRUCTIVE)
docker-compose down -v
docker-compose up -d
```

### Module Not Found Errors

```bash
# Reinstall all dependencies
pnpm install

# Clean cache and reinstall
pnpm clean
pnpm install
```

### Database Migration Issues

```bash
# Rollback last migration
pnpm db:migrate:revert

# Check migration status
docker exec freebase-postgres psql -U postgres -d freebase -c "SELECT * FROM migrations;"
```

---

## Development Tips

### Environment Variables
- Keep `.env` out of git (it's in `.gitignore`)
- Use `.env.example` as a template for new variables
- Never commit secrets to git

### Commit Messages
- Use descriptive, imperative mood commits
- Example: "Add email verification flow" (not "Added email verification")
- Reference issues: "Fix #123: Resolve login bug"

### Git Workflow
```bash
# Create a feature branch
git checkout -b feature/add-email-verification

# Make changes and commit
git commit -am "Add email verification flow"

# Push to remote
git push origin feature/add-email-verification

# Create a pull request on GitHub
```

### Hot Reload
- Backend: Changes in `apps/backend/src/**` auto-reload
- Frontend: Next.js Fast Refresh reloads changed components
- Shared packages: May require restart

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter=backend

# View build output
ls apps/backend/dist
ls apps/frontend/.next
```

---

## Useful Commands Reference

```bash
# Development
pnpm dev                    # Start all services
pnpm dev --filter=backend   # Start only backend

# Testing
pnpm test                   # Run all tests
pnpm test:watch             # Watch mode
pnpm test -- --coverage     # With coverage

# Code Quality
pnpm lint                   # Check linting
pnpm lint:fix               # Fix linting issues
pnpm type-check             # Check types

# Building
pnpm build                  # Build all
pnpm build --filter=backend # Build only backend

# Database
pnpm db:migrate             # Run migrations
pnpm db:generate            # Generate migrations
pnpm db:seed                # Seed test data

# Docker
docker-compose ps           # View services
docker-compose logs -f      # View logs
docker-compose restart      # Restart services
docker-compose down         # Stop services
docker-compose down -v      # Stop and remove volumes

# Cleaning
pnpm clean                  # Remove node_modules and dist
```

---

## Next Steps

1. **Read the Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. **Review API Docs**: See [API.md](./API.md) for endpoint documentation
3. **Check Roadmap**: See [ROADMAP.md](../ROADMAP.md) for implementation phases
4. **Start Coding**: Pick a feature from the roadmap and start implementing!

---

## Getting Help

- Check existing issues on GitHub
- Read documentation in `docs/`
- Review code comments and tests
- Ask in pull request reviews

Happy coding! 🚀
