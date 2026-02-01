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

@Entity('project_domains')
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255, unique: true })
  domain: string;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  isCustom: boolean;

  @Column({ name: 'dns_verified', type: 'boolean', default: false })
  dnsVerified: boolean;

  @Column({ name: 'dns_token', type: 'varchar', length: 255, nullable: true })
  dnsToken: string | null;

  @Column({ name: 'ssl_cert_expiry', type: 'timestamp', nullable: true })
  sslCertExpiry: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
