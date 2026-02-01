import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './services/database.service';
import { QueryValidatorService } from './services/query-validator.service';
import { QueryLog } from './entities/query-log.entity';
import { Project } from '../projects/entities/project.entity';
import { EncryptionService } from '../projects/services/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueryLog, Project])],
  controllers: [DatabaseController],
  providers: [DatabaseService, QueryValidatorService, EncryptionService],
  exports: [DatabaseService, QueryValidatorService],
})
export class DatabaseModule {}
