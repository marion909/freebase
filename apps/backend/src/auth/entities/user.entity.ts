import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Column({ name: 'verification_token_expires_at', nullable: true, type: 'timestamp with time zone' })
  verificationTokenExpiresAt: Date | null;

  @Column({ name: 'reset_password_token', nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires_at', nullable: true, type: 'timestamp with time zone' })
  resetPasswordExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
