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
import { Resume } from '../resumes/resume.entity.js';
import { User } from '../users/user.entity.js';

export enum WorkMode {
  Remote = 'remote',
  Hybrid = 'hybrid',
  Onsite = 'onsite',
}

/** Colunas do kanban: Encontradas, Candidatado, Entrevista, Oferta e Rejeitados. */
export enum JobStage {
  Found = 'found',
  Applied = 'applied',
  Interview = 'interview',
  Offer = 'offer',
  Rejected = 'rejected',
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

  /** Página da vaga no site de origem (Gupy, Remotive...). */
  @Column({ type: 'text', nullable: true })
  link: string | null;

  /** Descrição completa da vaga (preenchida no cadastro manual). */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Currículo comparado com a vaga na análise de ATS. */
  @Column({ name: 'resume_id', type: 'uuid', nullable: true })
  resumeId: string | null;

  @ManyToOne(() => Resume, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resume_id', foreignKeyConstraintName: 'FK_jobs_resume' })
  resume?: Resume | null;

  /** Resultado da análise de ATS (vaga x currículo) devolvido pelo n8n. */
  @Column({ type: 'jsonb', nullable: true })
  ats: Record<string, unknown> | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
