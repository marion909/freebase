# Database Migrations

This directory contains SQL migration files for the Freebase database.

## Running Migrations

Migrations are executed in numerical order. To run migrations:

```bash
# Connect to the database
docker exec -it freebase-postgres psql -U postgres -d freebase

# Run a specific migration
\i /path/to/migration.sql

# Or manually copy-paste the SQL
```

## Migration Naming Convention

Migrations follow this pattern:
```
NNN_description_of_change.sql
```

Where `NNN` is a three-digit number (001, 002, etc.) that determines execution order.

## Current Migrations

- `001_create_users_table.sql` - Creates users table with authentication fields
