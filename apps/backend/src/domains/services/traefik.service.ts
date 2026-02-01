import { Injectable, Logger } from '@nestjs/common';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export interface TraefikRouterConfig {
  rule: string;
  service: string;
  entryPoints?: string[];
  tls?: {
    certResolver?: string;
    domains?: Array<{
      main: string;
      sans?: string[];
    }>;
  };
  middlewares?: string[];
}

export interface TraefikServiceConfig {
  loadBalancer: {
    servers: Array<{
      url: string;
    }>;
  };
}

export interface TraefikDynamicConfig {
  http: {
    routers: Record<string, TraefikRouterConfig>;
    services: Record<string, TraefikServiceConfig>;
  };
}

@Injectable()
export class TraefikService {
  private readonly logger = new Logger(TraefikService.name);
  private readonly configDir = join(process.cwd(), '..', '..', 'docker', 'traefik', 'dynamic');

  constructor() {
    this.ensureConfigDir();
  }

  /**
   * Ensure the dynamic configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true });
      this.logger.log(`Created Traefik dynamic config directory: ${this.configDir}`);
    }
  }

  /**
   * Generate Traefik dynamic configuration for a project's domains
   */
  generateDynamicConfig(
    projectId: string,
    projectSlug: string,
    domains: string[],
  ): TraefikDynamicConfig {
    const routerName = `project-${projectSlug}`;
    const serviceName = `project-${projectSlug}`;
    const containerName = `freebase-project-${projectSlug}`;

    // Build the Host rule for all domains
    const hostRules = domains.map(domain => `Host(\`${domain}\`)`).join(' || ');

    const config: TraefikDynamicConfig = {
      http: {
        routers: {
          [routerName]: {
            rule: hostRules,
            service: serviceName,
            entryPoints: ['web', 'websecure'],
            tls: {
              certResolver: 'letsencrypt',
            },
          },
        },
        services: {
          [serviceName]: {
            loadBalancer: {
              servers: [
                {
                  url: `http://${containerName}:5432`,
                },
              ],
            },
          },
        },
      },
    };

    return config;
  }

  /**
   * Write Traefik dynamic configuration file
   */
  async writeConfigFile(
    projectId: string,
    projectSlug: string,
    domains: string[],
  ): Promise<void> {
    if (domains.length === 0) {
      this.logger.warn(`No domains to configure for project ${projectId}`);
      return;
    }

    const config = this.generateDynamicConfig(projectId, projectSlug, domains);
    const configPath = join(this.configDir, `${projectId}.yml`);

    try {
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
      });

      await writeFile(configPath, yamlContent, 'utf-8');
      this.logger.log(`Wrote Traefik config for project ${projectSlug}: ${configPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write Traefik config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Delete Traefik dynamic configuration file
   */
  async deleteConfigFile(projectId: string): Promise<void> {
    const configPath = join(this.configDir, `${projectId}.yml`);

    try {
      if (existsSync(configPath)) {
        await unlink(configPath);
        this.logger.log(`Deleted Traefik config for project ${projectId}`);
      } else {
        this.logger.warn(`Traefik config file not found: ${configPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete Traefik config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Update Traefik configuration after domain changes
   */
  async updateConfig(
    projectId: string,
    projectSlug: string,
    domains: string[],
  ): Promise<void> {
    if (domains.length === 0) {
      // No domains, delete config file
      await this.deleteConfigFile(projectId);
    } else {
      // Write/update config file
      await this.writeConfigFile(projectId, projectSlug, domains);
    }
  }
}
