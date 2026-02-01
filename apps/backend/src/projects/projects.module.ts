import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './services/projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { DockerService } from './services/docker.service';
import { EncryptionService } from './services/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController],
  providers: [ProjectsService, DockerService, EncryptionService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
