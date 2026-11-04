import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

// Espelha a migration CreateResumes para o TypeORM não tentar removê-los num `migration:generate`.
@Entity('resumes')
@Index('UQ_resumes_storage_key', ['storageKey'], { unique: true })
@Index('IDX_resumes_user_created', { synchronize: false }) // (user_id, created_at DESC)
@Index('UQ_resumes_one_primary_per_user', { synchronize: false }) // único parcial WHERE is_primary
@Check('CHK_resumes_size', `"size_bytes" > 0 AND "size_bytes" <= 5242880`)
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_resumes_user' })
  user?: User;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  /** Nome do arquivo no disco (UPLOAD_DIR). Não é exposto pela API. */
  @Column({ name: 'storage_key', type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  /** Resultado da análise de ATS (JSON em texto), gravado pelo fluxo do n8n. */
  @Column({ name: 'ats', type: 'text', nullable: true })
  ats: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
