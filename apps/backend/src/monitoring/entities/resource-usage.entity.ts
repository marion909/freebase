import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('resource_usage')
export class ResourceUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'storage_bytes', type: 'bigint', default: 0 })
  storageBytes: string; // bigint is returned as string in node-postgres

  @Column({ name: 'cpu_usage_percent', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  cpuUsagePercent: number;

  @Column({ name: 'memory_usage_mb', type: 'integer', default: 0 })
  memoryUsageMb: number;

  @Column({ name: 'storage_exceeded', type: 'boolean', default: false })
  storageExceeded: boolean;

  @Column({ name: 'last_checked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCheckedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
