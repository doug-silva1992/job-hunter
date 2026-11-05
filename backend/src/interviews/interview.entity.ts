import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from '../jobs/job.entity.js';
import { User } from '../users/user.entity.js';

/** in_progress → finished (usuário encerrou) → sent (áudios entregues ao n8n). */
export enum InterviewStatus {
  InProgress = 'in_progress',
  Finished = 'finished',
  Sent = 'sent',
}

// Espelha a migration CreateInterviews.
@Entity('interviews')
@Index('IDX_interviews_user_created', ['userId', 'createdAt'])
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_interviews_user' })
  user?: User;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id', foreignKeyConstraintName: 'FK_interviews_job' })
  job?: Job;

  @Column({ type: 'enum', enum: InterviewStatus, enumName: 'interview_status', default: InterviewStatus.InProgress })
  status: InterviewStatus;

  @OneToMany(() => InterviewAnswer, (a) => a.interview)
  answers?: InterviewAnswer[];

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  /** Quando os áudios foram entregues ao n8n. */
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/** Uma resposta gravada; regravar a mesma pergunta substitui o áudio. */
@Entity('interview_answers')
@Unique('UQ_interview_answers_question', ['interviewId', 'questionIndex'])
export class InterviewAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'interview_id', type: 'uuid' })
  interviewId: string;

  @ManyToOne(() => Interview, (i) => i.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interview_id', foreignKeyConstraintName: 'FK_interview_answers_interview' })
  interview?: Interview;

  /** Ordem da pergunta na entrevista (0, 1, 2...). */
  @Column({ name: 'question_index', type: 'smallint' })
  questionIndex: number;

  /** Texto da pergunta feita pelo entrevistador. */
  @Column({ type: 'text' })
  question: string;

  /** Caminho relativo a INTERVIEW_AUDIO_DIR: <userId>/<interviewId>/<NN>.<ext>. Não é exposto pela API. */
  @Column({ name: 'storage_key', type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ name: 'duration_ms', type: 'integer' })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
