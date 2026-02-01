import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'docker_container_id', type: 'varchar', nullable: true })
  dockerContainerId: string | null;

  @Column({ name: 'docker_network_name', type: 'varchar', nullable: true })
  dockerNetworkName: string | null;

  @Column({ name: 'database_host', type: 'varchar', nullable: true })
  databaseHost: string | null;

  @Column({ name: 'database_port', type: 'int', default: 5432 })
  databasePort: number;

  @Column({ name: 'database_name', type: 'varchar', nullable: true })
  databaseName: string | null;

  @Column({ name: 'database_user', type: 'varchar', nullable: true })
  databaseUser: string | null;

  @Column({ name: 'database_password_encrypted', type: 'text', nullable: true })
  databasePasswordEncrypted: string | null;

  @Column({ name: 'storage_used_bytes', type: 'bigint', default: 0 })
  storageUsedBytes: number;

  @Column({ name: 'storage_limit_bytes', type: 'bigint', default: 1073741824 })
  storageLimitBytes: number;

  @Column({ type: 'varchar', length: 50, default: 'provisioning' })
  status: 'active' | 'suspended' | 'provisioning' | 'error';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
