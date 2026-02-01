import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';


export interface ContainerConfig {
  projectSlug: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

export interface ContainerInfo {
  containerId: string;
  networkName: string;
  host: string;
  port: number;
}

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker: Docker;

  constructor() {
    // On Windows, Docker Desktop uses a named pipe instead of Unix socket
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      this.docker = new Docker({
        socketPath: '//./pipe/docker_engine',
      });
      this.logger.log('Initialized Docker client with Windows named pipe');
    } else {
      this.docker = new Docker({
        socketPath: '/var/run/docker.sock',
      });
      this.logger.log('Initialized Docker client with Unix socket');
    }
  }

  /**
   * Create and start a PostgreSQL container for a project
   */
  async createProjectContainer(
    config: ContainerConfig,
  ): Promise<ContainerInfo> {
    try {
      const containerName = `freebase-project-${config.projectSlug}`;
      const networkName = `freebase-net-${config.projectSlug}`;

      this.logger.log(`Creating container ${containerName}...`);

      // Create dedicated network for isolation
      await this.createNetwork(networkName);
      this.logger.log(`Created network ${networkName}`);

      // Pull PostgreSQL image if not exists
      await this.pullImageIfNotExists('postgres:16-alpine');

      // Create container
      const container = await this.docker.createContainer({
        Image: 'postgres:16-alpine',
        name: containerName,
        Env: [
          `POSTGRES_DB=${config.dbName}`,
          `POSTGRES_USER=${config.dbUser}`,
          `POSTGRES_PASSWORD=${config.dbPassword}`,
        ],
        HostConfig: {
          NetworkMode: networkName,
          Memory: 512 * 1024 * 1024, // 512MB
          NanoCpus: 1000000000, // 1 CPU
          RestartPolicy: {
            Name: 'unless-stopped',
          },
        },
        Healthcheck: {
          Test: ['CMD-SHELL', 'pg_isready -U ' + config.dbUser],
          Interval: 10000000000, // 10s in nanoseconds
          Timeout: 5000000000, // 5s
          Retries: 5,
        },
      });

      // Start container
      await container.start();
      this.logger.log(`Started container ${containerName}`);

      // Wait for container to be healthy
      await this.waitForHealthy(container.id, 30000);

      return {
        containerId: container.id,
        networkName: networkName,
        host: containerName, // Container name is DNS resolvable in Docker network
        port: 5432,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create container: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop and remove a project container
   */
  async removeProjectContainer(containerId: string, networkName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);

      // Stop container
      await container.stop({ t: 10 });
      this.logger.log(`Stopped container ${containerId}`);

      // Remove container
      await container.remove();
      this.logger.log(`Removed container ${containerId}`);

      // Remove network
      const network = this.docker.getNetwork(networkName);
      await network.remove();
      this.logger.log(`Removed network ${networkName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove container: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get container storage usage in bytes
   */
  async getContainerStorageUsage(containerId: string): Promise<number> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats: any = await container.stats({ stream: false });
      
      // Calculate storage from filesystem stats
      const storageUsed = stats.storage_stats?.used_bytes || 0;
      return storageUsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get storage usage: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Check if container is healthy
   */
  async isContainerHealthy(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const inspect = await container.inspect();
      
      return inspect.State?.Health?.Status === 'healthy';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check container health: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Create Docker network
   */
  private async createNetwork(name: string): Promise<Docker.Network> {
    try {
      return await this.docker.createNetwork({
        Name: name,
        Driver: 'bridge',
        Internal: false,
        Attachable: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create network: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Pull Docker image if not exists
   */
  private async pullImageIfNotExists(imageName: string): Promise<void> {
    try {
      const images = await this.docker.listImages();
      const imageExists = images.some((img) =>
        img.RepoTags?.includes(imageName),
      );

      if (!imageExists) {
        this.logger.log(`Pulling image ${imageName}...`);
        await new Promise((resolve, reject) => {
          this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) return reject(err);

            this.docker.modem.followProgress(stream, (err: Error | null, output: any[]) => {
              if (err) return reject(err);
              resolve(output);
            });
          });
        });
        this.logger.log(`Image ${imageName} pulled successfully`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to pull image: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Wait for container to be healthy
   */
  private async waitForHealthy(
    containerId: string,
    timeoutMs: number,
  ): Promise<void> {
    const startTime = Date.now();
    const container = this.docker.getContainer(containerId);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const inspect = await container.inspect();
        const health = inspect.State?.Health?.Status;

        if (health === 'healthy') {
          this.logger.log(`Container ${containerId} is healthy`);
          return;
        }

        if (health === 'unhealthy') {
          throw new Error('Container became unhealthy');
        }

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        if (Date.now() - startTime >= timeoutMs) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Container health check timeout: ${errorMessage}`);
        }
      }
    }

    throw new Error('Container health check timeout');
  }
}
