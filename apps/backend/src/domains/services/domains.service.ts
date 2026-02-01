import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain } from '../entities/domain.entity';
import { Project } from '../../projects/entities/project.entity';
import { TraefikService } from './traefik.service';
import * as crypto from 'crypto';
import * as dns from 'dns/promises';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly traefikService: TraefikService,
  ) {}

  /**
   * Generate a random DNS verification token
   */
  generateDnsToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate domain format
   */
  validateDomain(domain: string): boolean {
    // Basic domain validation regex
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Verify DNS TXT record for domain verification
   */
  async verifyDnsTxt(domain: string, expectedToken: string): Promise<boolean> {
    try {
      this.logger.log(`Verifying DNS TXT record for domain: ${domain}`);
      
      // Look for TXT record at _freebase-verify subdomain
      const verifyDomain = `_freebase-verify.${domain}`;
      const records = await dns.resolveTxt(verifyDomain);
      
      // Flatten the TXT record arrays (each record can be multiple strings)
      const txtValues = records.map(record => record.join(''));
      
      this.logger.log(`Found TXT records: ${JSON.stringify(txtValues)}`);
      
      // Check if any TXT record matches the expected token
      const isVerified = txtValues.some(value => value === expectedToken);
      
      if (isVerified) {
        this.logger.log(`DNS verification successful for ${domain}`);
      } else {
        this.logger.warn(`DNS verification failed for ${domain}. Expected token: ${expectedToken}`);
      }
      
      return isVerified;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`DNS lookup failed for ${domain}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Create a new domain (standard or custom)
   */
  async createDomain(
    projectId: string,
    domainName: string,
    isCustom: boolean = false,
  ): Promise<Domain> {
    // Validate domain format
    if (!this.validateDomain(domainName)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Check if project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if domain already exists
    const existingDomain = await this.domainRepository.findOne({
      where: { domain: domainName },
    });

    if (existingDomain) {
      throw new ConflictException('Domain already exists');
    }

    // Create domain entity
    const domain = this.domainRepository.create({
      projectId,
      domain: domainName,
      isCustom,
      dnsVerified: !isCustom, // Standard domains are automatically verified
      dnsToken: isCustom ? this.generateDnsToken() : null,
    });

    const savedDomain = await this.domainRepository.save(domain);

    // Update Traefik configuration for standard domains
    if (!isCustom) {
      await this.updateTraefikConfig(projectId, project.slug);
    }

    return savedDomain;
  }

  /**
   * Get all domains for a project
   */
  async listDomains(projectId: string): Promise<Domain[]> {
    return await this.domainRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific domain
   */
  async getDomain(projectId: string, domainName: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { projectId, domain: domainName },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  /**
   * Verify custom domain DNS configuration
   */
  async verifyDomain(projectId: string, domainName: string): Promise<Domain> {
    const domain = await this.getDomain(projectId, domainName);

    if (!domain.isCustom) {
      throw new BadRequestException('Cannot verify standard domains');
    }

    if (domain.dnsVerified) {
      this.logger.log(`Domain ${domainName} is already verified`);
      return domain;
    }

    if (!domain.dnsToken) {
      throw new BadRequestException('Domain has no DNS token');
    }

    // Verify DNS TXT record
    const isVerified = await this.verifyDnsTxt(domainName, domain.dnsToken);

    if (isVerified) {
      domain.dnsVerified = true;
      const verifiedDomain = await this.domainRepository.save(domain);
      
      // Update Traefik configuration to include the verified custom domain
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      
      if (project) {
        await this.updateTraefikConfig(projectId, project.slug);
      }
      
      return verifiedDomain;
    } else {
      throw new BadRequestException('DNS verification failed. Please check TXT record.');
    }
  }

  /**
   * Delete a domain
   */
  async deleteDomain(projectId: string, domainName: string): Promise<void> {
    const domain = await this.getDomain(projectId, domainName);
    await this.domainRepository.remove(domain);
    this.logger.log(`Deleted domain ${domainName} for project ${projectId}`);
    
    // Update Traefik configuration after domain deletion
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    
    if (project) {
      await this.updateTraefikConfig(projectId, project.slug);
    }
  }

  /**
   * Generate standard domain name for a project
   */
  generateStandardDomain(projectSlug: string): string {
    return `${projectSlug}.Neuhauser.network`;
  }

  /**
   * Get DNS instructions for domain verification
   */
  getDnsInstructions(domain: Domain): {
    recordType: string;
    name: string;
    value: string;
    example: string;
  } {
    if (!domain.dnsToken) {
      throw new BadRequestException('Domain has no DNS token');
    }
    
    return {
      recordType: 'TXT',
      name: `_freebase-verify.${domain.domain}`,
      value: domain.dnsToken,
      example: `_freebase-verify.${domain.domain}  IN  TXT  "${domain.dnsToken}"`,
    };
  }

  /**
   * Check SSL certificate expiry and update
   */
  async updateSslExpiry(domainName: string, expiryDate: Date): Promise<void> {
    const domain = await this.domainRepository.findOne({
      where: { domain: domainName },
    });

    if (domain) {
      domain.sslCertExpiry = expiryDate;
      await this.domainRepository.save(domain);
      this.logger.log(`Updated SSL expiry for ${domainName} to ${expiryDate}`);
    }
  }

  /**
   * Update Traefik configuration for a project with all verified domains
   */
  private async updateTraefikConfig(projectId: string, projectSlug: string): Promise<void> {
    // Get all verified domains for the project
    const domains = await this.domainRepository.find({
      where: { projectId, dnsVerified: true },
    });

    const domainNames = domains.map(d => d.domain);
    
    // Update Traefik configuration
    await this.traefikService.updateConfig(projectId, projectSlug, domainNames);
  }
}
