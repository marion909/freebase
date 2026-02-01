import { Controller, Get, Param, UseGuards, Logger, Post } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { StorageCronjobService } from './services/storage-cronjob.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceUsageDto } from './dto/storage-usage.dto';

@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly storageCronjob: StorageCronjobService,
  ) {}

  /**
   * Get storage and resource usage for a project
   * GET /api/v1/projects/:projectId/usage
   */
  @Get('usage')
  async getProjectUsage(@Param('projectId') projectId: string): Promise<ResourceUsageDto> {
    this.logger.log(`Getting usage for project ${projectId}`);
    return await this.storageService.getProjectUsage(projectId);
  }

  /**
   * Manually trigger storage monitoring for all projects
   * POST /api/v1/projects/monitoring/trigger
   * (Admin only - should add admin guard in production)
   */
  @Post('monitoring/trigger')
  async triggerStorageMonitoring(): Promise<{ message: string }> {
    this.logger.log('Manual storage monitoring triggered');
    await this.storageCronjob.triggerManualCheck();
    return { message: 'Storage monitoring triggered successfully' };
  }
}
