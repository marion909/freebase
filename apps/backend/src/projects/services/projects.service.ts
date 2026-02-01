import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from '../dto/project.dto';
import { DockerService } from './docker.service';
import { EncryptionService } from './encryption.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dockerService: DockerService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create a new project with Docker container
   */
  async create(
    userId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Creating project "${createProjectDto.name}" for user ${userId}`);

    // Generate slug
    const slug = await this.generateUniqueSlug(createProjectDto.name);

    // Generate database credentials
    const dbName = `freebase_${slug}`;
    const dbUser = `freebase_${slug}`;
    const dbPassword = this.generatePassword();

    // Create project record with provisioning status
    const project = this.projectRepository.create({
      name: createProjectDto.name,
      slug: slug,
      ownerId: userId,
      status: 'provisioning',
      databaseName: dbName,
      databaseUser: dbUser,
      databasePasswordEncrypted: await this.encryptionService.encrypt(dbPassword),
    });

    await this.projectRepository.save(project);

    try {
      // Provision Docker container
      const containerInfo = await this.dockerService.createProjectContainer({
        projectSlug: slug,
        dbName: dbName,
        dbUser: dbUser,
        dbPassword: dbPassword,
      });

      // Update project with container details
      project.dockerContainerId = containerInfo.containerId;
      project.dockerNetworkName = containerInfo.networkName;
      project.databaseHost = containerInfo.host;
      project.databasePort = containerInfo.port;
      project.status = 'active';

      await this.projectRepository.save(project);

      this.logger.log(`Project ${slug} created successfully`);

      return this.toResponseDto(project, dbPassword);
    } catch (error) {
      // Mark project as error if provisioning fails
      project.status = 'error';
      await this.projectRepository.save(project);

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to provision project ${slug}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Find all projects for a user
   */
  async findAllByUser(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      projects.map(async (project) => {
        const password = project.databasePasswordEncrypted
          ? await this.encryptionService.decrypt(project.databasePasswordEncrypted)
          : undefined;
        return this.toResponseDto(project, password);
      }),
    );
  }

  /**
   * Find one project by ID
   */
  async findOne(id: string, userId: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const password = project.databasePasswordEncrypted
      ? await this.encryptionService.decrypt(project.databasePasswordEncrypted)
      : undefined;

    return this.toResponseDto(project, password);
  }

  /**
   * Update project
   */
  async update(
    id: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Update allowed fields
    if (updateProjectDto.name) {
      project.name = updateProjectDto.name;
    }
    if (updateProjectDto.status) {
      project.status = updateProjectDto.status;
    }

    await this.projectRepository.save(project);

    const password = project.databasePasswordEncrypted
      ? await this.encryptionService.decrypt(project.databasePasswordEncrypted)
      : undefined;

    return this.toResponseDto(project, password);
  }

  /**
   * Delete project and its container
   */
  async remove(id: string, userId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Remove Docker container if exists
    if (project.dockerContainerId && project.dockerNetworkName) {
      try {
        await this.dockerService.removeProjectContainer(
          project.dockerContainerId,
          project.dockerNetworkName,
        );
        this.logger.log(`Removed container for project ${project.slug}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to remove container: ${errorMessage}`);
        // Continue with project deletion even if container removal fails
      }
    }

    await this.projectRepository.remove(project);
    this.logger.log(`Project ${project.slug} deleted`);
  }

  /**
   * Generate unique slug from project name
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check uniqueness
    let uniqueSlug = slug;
    let counter = 1;

    while (await this.projectRepository.findOne({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Generate secure random password
   */
  private generatePassword(): string {
    return randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(project: Project, password?: string): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      ownerId: project.ownerId,
      databaseHost: project.databaseHost,
      databasePort: project.databasePort,
      databaseName: project.databaseName,
      databaseUser: project.databaseUser,
      databasePassword: password,
      storageUsedBytes: project.storageUsedBytes,
      storageLimitBytes: project.storageLimitBytes,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
