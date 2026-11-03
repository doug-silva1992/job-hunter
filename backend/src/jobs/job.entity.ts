import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

export enum WorkMode {
  Remote = 'remote',
  Hybrid = 'hybrid',
  Onsite = 'onsite',
}

/** Colunas do kanban: Encontradas, Candidatado, Entrevista e Oferta. */
export enum JobStage {
  Found = 'found',
  Applied = 'applied',
  Interview = 'interview',
  Offer = 'offer',
}

// Espelha a migration CreateJobs para o TypeORM não tentar removê-los num `migration:generate`.
@Entity('jobs')
@Index('IDX_jobs_user_stage', ['userId', 'stage'])
@Index('IDX_jobs_user_match', { synchronize: false }) // (user_id, match_score DESC)
@Check('CHK_jobs_match_score', `"match_score" BETWEEN 0 AND 100`)
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_jobs_user' })
  user?: User;

  @Column({ type: 'varchar', length: 120 })
  company: string;

  @Column({ type: 'varchar', length: 160 })
  role: string;

  @Column({ type: 'varchar', length: 120 })
  location: string;

  @Column({ name: 'work_mode', type: 'enum', enum: WorkMode, enumName: 'job_work_mode' })
  workMode: WorkMode;

  /** Percentual de aderência ao perfil (0–100). */
  @Column({ name: 'match_score', type: 'smallint' })
  match: number;

  @Column({ type: 'text', array: true, default: () => `'{}'` })
  tags: string[];

  @Column({ type: 'enum', enum: JobStage, enumName: 'job_stage', default: JobStage.Found })
  stage: JobStage;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
