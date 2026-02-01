export interface StorageUsageDto {
  storageBytes: number;
  storageMb: number;
  storageGb: number;
  limitBytes: number;
  limitMb: number;
  limitGb: number;
  usagePercent: number;
  exceeded: boolean;
  warningLevel: 'normal' | 'warning' | 'critical'; // normal < 80%, warning 80-90%, critical > 90%
}

export interface ResourceUsageDto {
  storage: StorageUsageDto;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  lastCheckedAt: Date;
}
