export * from './user';
export * from './project';
export * from './domain';
export * from './resource-usage';

export const STORAGE_LIMIT_GB = 1;
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;
export const STORAGE_WARNING_THRESHOLD_BYTES = 900 * 1024 * 1024; // 900MB

export const DB_PORT_RANGE = {
  min: 5433,
  max: 6100,
};

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
