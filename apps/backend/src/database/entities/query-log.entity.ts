import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('query_logs')
export class QueryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'query_text', type: 'text' })
  queryText: string;

  @Column({ name: 'query_hash', type: 'varchar', length: 64 })
  queryHash: string;

  @Column({ name: 'executed_by_user_id', type: 'uuid', nullable: true })
  executedByUserId: string;

  @Column({ name: 'executed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  executedAt: Date;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number;

  @Column({ name: 'rows_affected', type: 'integer', nullable: true })
  rowsAffected: number;

  @Column({ name: 'success', type: 'boolean', default: true })
  success: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
