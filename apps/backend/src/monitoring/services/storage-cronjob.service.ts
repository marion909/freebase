import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StorageService } from './storage.service';

@Injectable()
export class StorageCronjobService {
  private readonly logger = new Logger(StorageCronjobService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Run storage monitoring daily at 2 AM
   * Cron format: second minute hour day month dayOfWeek
   */
  @Cron('0 0 2 * * *', {
    name: 'storage-monitoring',
    timeZone: 'Europe/Berlin',
  })
  async handleStorageMonitoring() {
    this.logger.log('🔍 Starting scheduled storage monitoring...');
    const startTime = Date.now();

    try {
      await this.storageService.updateAllProjectsUsage();
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Storage monitoring completed in ${duration}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Storage monitoring failed: ${errorMessage}`);
    }
  }

  /**
   * Manual trigger for testing (can be called via endpoint)
   */
  async triggerManualCheck() {
    this.logger.log('🔍 Manual storage monitoring triggered');
    await this.handleStorageMonitoring();
  }
}
