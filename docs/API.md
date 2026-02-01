# API Documentation (v1)

Complete REST API reference for Freebase.

## Base URL

```
http://localhost:3001/api/v1          # Development
https://api.Neuhauser.network/api/v1    # Production
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer {accessToken}
```

## Response Format

All responses are JSON with consistent structure:

**Success Response:**
```json
{
  "data": { ... },
  "statusCode": 200,
  "timestamp": "2026-02-01T10:30:00Z"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Email is already registered",
  "details": {
    "field": "email",
    "constraint": "UNIQUE"
  },
  "timestamp": "2026-02-01T10:30:00Z"
}
```

## Endpoints

### Authentication

#### Register
```
POST /auth/register
```

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "emailVerified": false
    },
    "message": "Check your email for verification link"
  }
}
```

**Errors:**
- 400: Invalid email format
- 400: Password too weak
- 409: Email already registered

---

#### Login
```
POST /auth/login
```

Authenticate and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
}
```

**Errors:**
- 400: Invalid credentials
- 403: Email not verified

---

#### Verify Email
```
POST /auth/verify-email
```

Verify email address with token.

**Query Parameters:**
- `token` (required): Verification token from email

**Response:** 200 OK
```json
{
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Errors:**
- 400: Invalid token
- 400: Token expired

---

#### Refresh Token
```
POST /auth/refresh
```

Get a new access token using refresh token.

**Response:** 200 OK
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

---

#### Get Current User
```
GET /auth/me
```

Get authenticated user info.

**Response:** 200 OK
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "emailVerified": true,
      "createdAt": "2026-02-01T10:00:00Z"
    }
  }
}
```

**Errors:**
- 401: Unauthorized (invalid token)

---

### Projects

#### List Projects
```
GET /projects
```

Get all projects for authenticated user.

**Response:** 200 OK
```json
{
  "data": {
    "projects": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "My App",
        "slug": "my-app",
        "description": "My first Freebase project",
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ],
    "total": 1
  }
}
```

---

#### Create Project
```
POST /projects
```

Create a new project (auto-provisions Docker container).

**Request:**
```json
{
  "name": "My App",
  "slug": "my-app",
  "description": "My first Freebase project"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "project": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "My App",
      "slug": "my-app",
      "description": "My first Freebase project",
      "dockerNetwork": "freebase-project-my-app",
      "standardDomain": "my-app.Neuhauser.network",
      "createdAt": "2026-02-01T10:00:00Z"
    },
    "message": "Project created. Docker container provisioning..."
  }
}
```

**Errors:**
- 400: Slug must be 3-63 characters
- 409: Slug already exists

---

#### Get Project
```
GET /projects/:id
```

Get project details.

**Response:** 200 OK
```json
{
  "data": {
    "project": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "My App",
      "slug": "my-app",
      "dockerNetwork": "freebase-project-my-app",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  }
}
```

---

#### Update Project
```
PUT /projects/:id
```

Update project metadata.

**Request:**
```json
{
  "name": "My Updated App",
  "description": "Updated description"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "project": { ... }
  }
}
```

---

#### Delete Project
```
DELETE /projects/:id
```

Permanently delete project (hard delete: removes Docker container, network, database).

**Response:** 204 No Content

**Errors:**
- 404: Project not found
- 403: Not project owner

---

### Database Admin

#### Get Tables
```
GET /projects/:id/db/tables
```

List all tables in project database.

**Response:** 200 OK
```json
{
  "data": {
    "tables": [
      {
        "name": "users",
        "rowCount": 150,
        "sizeBytes": 65536,
        "columns": [
          {
            "name": "id",
            "type": "uuid",
            "nullable": false,
            "isPrimaryKey": true
          },
          {
            "name": "email",
            "type": "varchar",
            "nullable": false
          }
        ]
      }
    ]
  }
}
```

---

#### Execute Query
```
POST /projects/:id/db/query
```

Execute SQL query on project database.

**Request:**
```json
{
  "query": "SELECT * FROM users LIMIT 10"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "rows": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ],
    "rowCount": 10,
    "executionTimeMs": 45,
    "durationMs": 120
  }
}
```

**Errors:**
- 400: SQL injection detected
- 408: Query timeout (>30s)
- 413: Result too large (>10MB)
- 507: Storage limit exceeded

---

#### Import Data
```
POST /projects/:id/db/import
```

Import CSV or SQL file.

**Request:** (multipart/form-data)
```
file: <CSV or SQL file>
tableName: "users"  # For CSV
skipHeader: true    # For CSV
```

**Response:** 200 OK
```json
{
  "data": {
    "message": "Imported 1000 rows",
    "rowsInserted": 1000
  }
}
```

---

### Domains

#### List Domains
```
GET /projects/:id/domains
```

List all domains for project.

**Response:** 200 OK
```json
{
  "data": {
    "domains": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "domain": "my-app.Neuhauser.network",
        "isCustom": false,
        "dnsVerified": true
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "domain": "myapp.com",
        "isCustom": true,
        "dnsVerified": true,
        "sslCertExpiry": "2027-02-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### Create Domain
```
POST /projects/:id/domains
```

Add custom domain (initiates DNS verification).

**Request:**
```json
{
  "domain": "myapp.com"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "domain": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "domain": "myapp.com",
      "isCustom": true,
      "dnsVerified": false,
      "dnsToken": "freebase-verify-abc123def456"
    },
    "verificationInstructions": "Add TXT record: freebase-verify-abc123def456 to myapp.com"
  }
}
```

---

#### Verify Domain
```
POST /projects/:id/domains/:domain/verify
```

Verify DNS and activate domain.

**Response:** 200 OK
```json
{
  "data": {
    "message": "Domain verified successfully",
    "domain": {
      "domain": "myapp.com",
      "dnsVerified": true,
      "sslCertExpiry": "2027-02-01T10:00:00Z"
    }
  }
}
```

**Errors:**
- 400: DNS record not found
- 400: Invalid DNS record

---

#### Delete Domain
```
DELETE /projects/:id/domains/:domain
```

Remove custom domain.

**Response:** 204 No Content

---

### Storage & Usage

#### Get Storage Usage
```
GET /projects/:id/usage
```

Get current storage usage.

**Response:** 200 OK
```json
{
  "data": {
    "usage": {
      "storageBytes": 536870912,
      "storageGb": 0.5,
      "limitGb": 1,
      "percentageUsed": 50,
      "status": "ok"
    }
  }
}
```

---

### Backups

#### List Backups
```
GET /projects/:id/backups
```

List available backups.

**Response:** 200 OK
```json
{
  "data": {
    "backups": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "backupDate": "2026-02-01T03:00:00Z",
        "sizeBytes": 1048576,
        "status": "completed",
        "downloadUrl": "https://..."
      }
    ]
  }
}
```

---

#### Manual Backup
```
POST /projects/:id/backups/manual
```

Trigger manual backup.

**Response:** 202 Accepted
```json
{
  "data": {
    "message": "Backup started"
  }
}
```

---

## Status Codes

- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST creating resource
- `202 Accepted` - Request accepted but processing
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `408 Request Timeout` - Query timeout
- `413 Payload Too Large` - Response too large
- `507 Insufficient Storage` - Storage limit exceeded
- `500 Internal Server Error` - Server error

---

**Last Updated**: February 2026
