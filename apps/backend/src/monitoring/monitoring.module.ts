import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { StorageService } from './services/storage.service';
import { StorageCronjobService } from './services/storage-cronjob.service';
import { ResourceUsage } from './entities/resource-usage.entity';
import { Project } from '../projects/entities/project.entity';
import { EncryptionService } from '../projects/services/encryption.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ResourceUsage, Project]),
  ],
  controllers: [MonitoringController],
  providers: [StorageService, StorageCronjobService, EncryptionService],
  exports: [StorageService],
})
export class MonitoringModule {}
