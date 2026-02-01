# Security Guide

This document outlines the security model, configuration, and operational checklist for Freebase.

## Core Principles

- **Least privilege**: services and users only access what they need.
- **Isolation by default**: each project runs in its own Docker network.
- **Defense in depth**: encryption, TLS, validation, and audit logging layered together.

## Authentication & Authorization

- JWT-based authentication for all protected endpoints.
- Email verification required for login.
- Ownership checks on all project-scoped endpoints.
- Passwords hashed with bcrypt.

## Encryption

- Database credentials stored encrypted (AES-256-GCM).
- Master key supplied via `ENCRYPTION_KEY` in environment variables.
- Encrypted format: `salt + iv + authTag + ciphertext`, base64 encoded.

## Network Isolation

- Each project gets a dedicated Docker network: `freebase-net-{slug}`.
- Project databases are not reachable across networks.
- Backend only connects to a project DB after ownership validation.

## TLS & Transport Security

- Traefik terminates TLS using Let's Encrypt (HTTP challenge).
- All external traffic should be HTTPS-only in production.
- Internal Docker traffic can remain HTTP (private network).

## Logging & Auditing

- Application logs are JSON structured and rotated daily (7-day retention).
- Error logs include context and optionally trigger email alerts.
- SQL queries are logged with sanitized query text and a hash for traceability.
- Sensitive data is never stored in logs.

## Secrets Management

- Never commit secrets to git.
- Use `.env` locally and `.env.production` on servers.
- GitHub Actions uses GitHub Secrets for deployment credentials.

## Operational Checklist

### Before Production

- [ ] `JWT_SECRET` set to a random 32+ character value
- [ ] `ENCRYPTION_KEY` set to a 32-byte random hex
- [ ] `DB_PASSWORD` and `SMTP_*` configured
- [ ] `LOG_ALERT_RECIPIENTS` configured for error alerts
- [ ] DNS records point to server (root + wildcard)
- [ ] HTTPS works for frontend and API

### After Deployment

- [ ] `/health` returns 200
- [ ] Backups are running and retained
- [ ] Logs are written and rotating
- [ ] Project creation + deletion workflows verified

## Incident Response

- Rotate all secrets (JWT, encryption, SMTP, DB).
- Revoke compromised credentials immediately.
- Investigate logs and audit trail for scope and impact.
- Notify affected users if required.
