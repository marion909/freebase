import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainsService } from './services/domains.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDomainDto } from './dto/domain.dto';
import { Domain } from './entities/domain.entity';

@Controller('projects/:projectId/domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  private readonly logger = new Logger(DomainsController.name);

  constructor(private readonly domainsService: DomainsService) {}

  /**
   * Create a new domain for a project
   * POST /api/v1/projects/:projectId/domains
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDomain(
    @Param('projectId') projectId: string,
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<{
    domain: Domain;
    dnsInstructions?: {
      recordType: string;
      name: string;
      value: string;
      example: string;
    };
  }> {
    this.logger.log(
      `Creating domain ${createDomainDto.domain} for project ${projectId}`,
    );

    const domain = await this.domainsService.createDomain(
      projectId,
      createDomainDto.domain,
      createDomainDto.isCustom || false,
    );

    // Return DNS instructions for custom domains
    const response: any = { domain };

    if (domain.isCustom) {
      response.dnsInstructions = this.domainsService.getDnsInstructions(domain);
    }

    return response;
  }

  /**
   * Get all domains for a project
   * GET /api/v1/projects/:projectId/domains
   */
  @Get()
  async listDomains(@Param('projectId') projectId: string): Promise<Domain[]> {
    this.logger.log(`Listing domains for project ${projectId}`);
    return await this.domainsService.listDomains(projectId);
  }

  /**
   * Get a specific domain
   * GET /api/v1/projects/:projectId/domains/:domain
   */
  @Get(':domain')
  async getDomain(
    @Param('projectId') projectId: string,
    @Param('domain') domain: string,
  ): Promise<Domain> {
    this.logger.log(`Getting domain ${domain} for project ${projectId}`);
    return await this.domainsService.getDomain(projectId, domain);
  }

  /**
   * Verify DNS configuration for a custom domain
   * POST /api/v1/projects/:projectId/domains/:domain/verify
   */
  @Post(':domain/verify')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(
    @Param('projectId') projectId: string,
    @Param('domain') domain: string,
  ): Promise<{ verified: boolean; domain: Domain }> {
    this.logger.log(`Verifying DNS for domain ${domain}`);

    const verifiedDomain = await this.domainsService.verifyDomain(
      projectId,
      domain,
    );

    return {
      verified: verifiedDomain.dnsVerified,
      domain: verifiedDomain,
    };
  }

  /**
   * Delete a domain
   * DELETE /api/v1/projects/:projectId/domains/:domain
   */
  @Delete(':domain')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDomain(
    @Param('projectId') projectId: string,
    @Param('domain') domain: string,
  ): Promise<void> {
    this.logger.log(`Deleting domain ${domain} for project ${projectId}`);
    await this.domainsService.deleteDomain(projectId, domain);
  }
}
