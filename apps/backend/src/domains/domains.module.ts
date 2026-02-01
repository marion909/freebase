import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainsController } from './domains.controller';
import { DomainsService } from './services/domains.service';
import { TraefikService } from './services/traefik.service';
import { Domain } from './entities/domain.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Domain, Project])],
  controllers: [DomainsController],
  providers: [DomainsService, TraefikService],
  exports: [DomainsService, TraefikService],
})
export class DomainsModule {}
