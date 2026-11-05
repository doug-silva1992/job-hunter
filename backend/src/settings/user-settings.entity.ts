import { Check, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { WorkMode } from '../jobs/job.entity.js';
import { User } from '../users/user.entity.js';

export enum Seniority {
  Intern = 'intern',
  Junior = 'junior',
  Mid = 'mid',
  Senior = 'senior',
  Specialist = 'specialist',
}

// Espelha a migration CreateUserSettings para o TypeORM não tentar removê-los num `migration:generate`.
@Entity('user_settings')
@Check('CHK_user_settings_min_match', `"min_match" BETWEEN 0 AND 100`)
@Check('CHK_user_settings_job_age', `"max_job_age_days" BETWEEN 1 AND 90`)
@Check('CHK_user_settings_salary', `"min_salary" IS NULL OR "min_salary" >= 0`)
export class UserSettings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_settings_user' })
  user?: User;

  /** Compatibilidade mínima (%) para uma vaga entrar no resultado da busca. */
  @Column({ name: 'min_match', type: 'smallint', default: 70 })
  minMatch: number;

  /** Cargos, tecnologias ou termos que a busca deve priorizar. */
  @Column({ type: 'text', array: true, default: () => `'{}'` })
  keywords: string[];

  /** Termos ou empresas que descartam a vaga. */
  @Column({ name: 'excluded_keywords', type: 'text', array: true, default: () => `'{}'` })
  excludedKeywords: string[];

  /** Vazio = qualquer nível. */
  @Column({ type: 'text', array: true, default: () => `'{}'` })
  seniority: Seniority[];

  @Column({
    name: 'work_modes',
    type: 'enum',
    enum: WorkMode,
    enumName: 'job_work_mode',
    array: true,
    default: () => `'{remote,hybrid,onsite}'`,
  })
  workModes: WorkMode[];

  /** Vazio = qualquer local. */
  @Column({ type: 'text', array: true, default: () => `'{}'` })
  locations: string[];

  /** Pretensão salarial mínima mensal (R$). */
  @Column({ name: 'min_salary', type: 'integer', nullable: true })
  minSalary: number | null;

  /** Considera só vagas publicadas nos últimos N dias. */
  @Column({ name: 'max_job_age_days', type: 'smallint', default: 30 })
  maxJobAgeDays: number;

  @Column({ name: 'notify_new_jobs', type: 'boolean', default: true })
  notifyNewJobs: boolean;

  @Column({ name: 'weekly_summary', type: 'boolean', default: false })
  weeklySummary: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
