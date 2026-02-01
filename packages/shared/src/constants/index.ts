import { z } from 'zod';

// Storage constants
export const STORAGE_LIMITS = {
  LIMIT_GB: 1,
  LIMIT_BYTES: 1 * 1024 * 1024 * 1024,
  WARNING_THRESHOLD_BYTES: 900 * 1024 * 1024,
  WARNING_PERCENTAGE: 90,
} as const;

// Docker constants
export const DOCKER_CONSTANTS = {
  PORT_RANGE_MIN: 5433,
  PORT_RANGE_MAX: 6100,
  NETWORK_PREFIX: 'freebase-project-',
  CONTAINER_PREFIX: 'freebase-project-',
} as const;

// API constants
export const API_CONSTANTS = {
  VERSION: 'v1',
  PREFIX: '/api/v1',
  QUERY_TIMEOUT_MS: 30000,
  QUERY_SIZE_LIMIT_MB: 10,
  MAX_ROWS_RETURNED: 10000,
} as const;

// JWT constants
export const JWT_CONSTANTS = {
  EXPIRY: '24h',
  REFRESH_EXPIRY: '7d',
} as const;

// Email constants
export const EMAIL_CONSTANTS = {
  VERIFICATION_TOKEN_TTL_HOURS: 24,
  RESEND_COOLDOWN_MS: 60000, // 1 minute
} as const;

// Backup constants
export const BACKUP_CONSTANTS = {
  RETENTION_DAYS: 7,
  SCHEDULE: '0 3 * * *', // 3 AM daily
} as const;

// Monitoring constants
export const MONITORING_CONSTANTS = {
  STORAGE_CHECK_SCHEDULE: '0 2 * * *', // 2 AM daily
  CLEANUP_SCHEDULE: '0 4 * * *', // 4 AM daily
} as const;
