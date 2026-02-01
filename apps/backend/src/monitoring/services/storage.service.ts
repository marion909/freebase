import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ResourceUsage } from '../entities/resource-usage.entity';
import { Project } from '../../projects/entities/project.entity';
import { StorageUsageDto, ResourceUsageDto } from '../dto/storage-usage.dto';
import { EncryptionService } from '../../projects/services/encryption.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB
  private readonly WARNING_THRESHOLD_BYTES = 900 * 1024 * 1024; // 900MB
  private readonly CRITICAL_THRESHOLD_BYTES = 950 * 1024 * 1024; // 950MB

  constructor(
    @InjectRepository(ResourceUsage)
    private readonly resourceUsageRepository: Repository<ResourceUsage>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly encryptionService: EncryptionService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calculate storage usage for a single project by querying its database
   */
  async calculateProjectStorage(projectId: string): Promise<number> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.databasePasswordEncrypted) {
        throw new Error(`Project ${projectId} has no encrypted password`);
      }

      // Query pg_database_size to get storage usage
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        const result = await queryRunner.query(
          `SELECT pg_database_size($1) as size_bytes`,
          [project.databaseName],
        );

        const sizeBytes = parseInt(result[0]?.size_bytes || '0', 10);
        this.logger.log(
          `Project ${project.slug} storage: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`,
        );

        return sizeBytes;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate storage for project ${projectId}: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Update resource usage for a project
   */
  async updateProjectUsage(projectId: string): Promise<ResourceUsage> {
    const storageBytes = await this.calculateProjectStorage(projectId);
    const storageExceeded = storageBytes >= this.STORAGE_LIMIT_BYTES;

    // Check if resource usage entry exists
    let resourceUsage = await this.resourceUsageRepository.findOne({
      where: { projectId },
    });

    if (resourceUsage) {
      // Update existing entry
      resourceUsage.storageBytes = storageBytes.toString();
      resourceUsage.storageExceeded = storageExceeded;
      resourceUsage.lastCheckedAt = new Date();
    } else {
      // Create new entry
      resourceUsage = this.resourceUsageRepository.create({
        projectId,
        storageBytes: storageBytes.toString(),
        storageExceeded,
        lastCheckedAt: new Date(),
      });
    }

    // Log warnings
    if (storageBytes >= this.CRITICAL_THRESHOLD_BYTES) {
      this.logger.warn(
        `⚠️ CRITICAL: Project ${projectId} storage at ${(storageBytes / 1024 / 1024).toFixed(2)} MB (> 950MB)`,
      );
    } else if (storageBytes >= this.WARNING_THRESHOLD_BYTES) {
      this.logger.warn(
        `⚠️ WARNING: Project ${projectId} storage at ${(storageBytes / 1024 / 1024).toFixed(2)} MB (> 900MB)`,
      );
    }

    return await this.resourceUsageRepository.save(resourceUsage);
  }

  /**
   * Update resource usage for all projects
   */
  async updateAllProjectsUsage(): Promise<void> {
    this.logger.log('Starting storage monitoring for all projects...');

    const projects = await this.projectRepository.find({
      where: { status: 'active' },
    });

    this.logger.log(`Found ${projects.length} active projects to monitor`);

    for (const project of projects) {
      try {
        await this.updateProjectUsage(project.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to update usage for project ${project.id}: ${errorMessage}`);
      }
    }

    this.logger.log('Completed storage monitoring for all projects');
  }

  /**
   * Get storage usage for a project
   */
  async getProjectUsage(projectId: string): Promise<ResourceUsageDto> {
    let resourceUsage = await this.resourceUsageRepository.findOne({
      where: { projectId },
    });

    // If no usage data exists, calculate it now
    if (!resourceUsage) {
      resourceUsage = await this.updateProjectUsage(projectId);
    }

    const storageBytes = parseInt(resourceUsage.storageBytes, 10);
    const usagePercent = (storageBytes / this.STORAGE_LIMIT_BYTES) * 100;

    let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (storageBytes >= this.CRITICAL_THRESHOLD_BYTES) {
      warningLevel = 'critical';
    } else if (storageBytes >= this.WARNING_THRESHOLD_BYTES) {
      warningLevel = 'warning';
    }

    const storageUsage: StorageUsageDto = {
      storageBytes,
      storageMb: storageBytes / 1024 / 1024,
      storageGb: storageBytes / 1024 / 1024 / 1024,
      limitBytes: this.STORAGE_LIMIT_BYTES,
      limitMb: 1024,
      limitGb: 1,
      usagePercent: Math.min(usagePercent, 100),
      exceeded: resourceUsage.storageExceeded,
      warningLevel,
    };

    return {
      storage: storageUsage,
      cpuUsagePercent: resourceUsage.cpuUsagePercent,
      memoryUsageMb: resourceUsage.memoryUsageMb,
      lastCheckedAt: resourceUsage.lastCheckedAt,
    };
  }

  /**
   * Check if a project has exceeded storage limit
   */
  async hasExceededStorageLimit(projectId: string): Promise<boolean> {
    const resourceUsage = await this.resourceUsageRepository.findOne({
      where: { projectId },
    });

    return resourceUsage?.storageExceeded || false;
  }
}
