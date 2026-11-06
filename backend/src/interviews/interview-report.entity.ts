import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from '../jobs/job.entity.js';

/** O pg devolve `numeric` como string. */
const numeric = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** Avaliação de uma resposta, como o Gemini devolve no fluxo do n8n. */
export type AnswerEvaluation = {
  pergunta?: number;
  nota?: number;
  pontos_fortes?: string;
  melhorias?: string;
  resposta_ideal_resumida?: string;
};

export type InterviewEvaluation = {
  respostas?: AnswerEvaluation[];
  avaliacao_geral?: { nota?: number; resumo?: string; recomendacao?: string };
};

/**
 * Relatório de uma simulação de entrevista (tabela "interviews", migration CreateInterviewReports).
 * As linhas são inseridas pelo fluxo "Interview Training" do n8n; os nomes das colunas seguem o fluxo.
 */
@Entity('interviews')
export class InterviewReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Preenchido pelo backend depois que o n8n grava a linha. */
  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId: string | null;

  @ManyToOne(() => Job, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'job_id', foreignKeyConstraintName: 'FK_interviews_job' })
  job?: Job | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'candidato_nome', type: 'text', nullable: true })
  candidatoNome: string | null;

  @Column({ name: 'candidato_email', type: 'text', nullable: true })
  candidatoEmail: string | null;

  @Column({ type: 'text', nullable: true })
  cargo: string | null;

  @Column({ type: 'text', nullable: true })
  requisitos: string | null;

  @Column({ name: 'audio_url_1', type: 'text', nullable: true })
  audioUrl1: string | null;

  @Column({ name: 'audio_url_2', type: 'text', nullable: true })
  audioUrl2: string | null;

  @Column({ name: 'audio_url_3', type: 'text', nullable: true })
  audioUrl3: string | null;

  @Column({ name: 'audio_url_4', type: 'text', nullable: true })
  audioUrl4: string | null;

  @Column({ name: 'nota_1', type: 'numeric', nullable: true, transformer: numeric })
  nota1: number | null;

  @Column({ name: 'nota_2', type: 'numeric', nullable: true, transformer: numeric })
  nota2: number | null;

  @Column({ name: 'nota_3', type: 'numeric', nullable: true, transformer: numeric })
  nota3: number | null;

  @Column({ name: 'nota_4', type: 'numeric', nullable: true, transformer: numeric })
  nota4: number | null;

  @Column({ name: 'nota_geral', type: 'numeric', nullable: true, transformer: numeric })
  notaGeral: number | null;

  @Column({ type: 'text', nullable: true })
  resumo: string | null;

  @Column({ type: 'text', nullable: true })
  recomendacao: string | null;

  @Column({ name: 'avaliacao_json', type: 'jsonb', nullable: true })
  avaliacao: InterviewEvaluation | null;

  /** "processando" ou "concluida" (texto livre gravado pelo n8n). */
  @Column({ type: 'text', nullable: true, default: 'processando' })
  status: string | null;
}
