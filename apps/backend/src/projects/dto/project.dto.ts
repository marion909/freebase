import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    example: 'My Awesome Project',
    description: 'Project name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'Short project description',
    description: 'Project description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProjectDto {
  @ApiProperty({
    example: 'Updated Project Name',
    description: 'Project name',
    required: false,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    example: 'active',
    description: 'Project status',
    enum: ['active', 'suspended'],
    required: false,
  })
  @IsString()
  @Matches(/^(active|suspended)$/)
  status?: 'active' | 'suspended';
}

export class ProjectResponseDto {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  databaseHost: string | null;
  databasePort: number;
  databaseName: string | null;
  databaseUser: string | null;
  databasePassword?: string; // Decrypted password (only shown when appropriate)
  storageUsedBytes: number;
  storageLimitBytes: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
