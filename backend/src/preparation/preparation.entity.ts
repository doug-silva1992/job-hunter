import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** O pg devolve `numeric` como string. */
const numeric = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Preparatório de uma vaga (tabela "preparations", migration CreatePreparations). Quem grava a linha
 * é o fluxo "interview-prep" do n8n; o backend lê e grava só a nota (score) da prova.
 */
@Entity('preparations')
export class Preparation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  /** JSON (texto) com as perguntas geradas: numero, tecnologia, nivel, pergunta, alternativas, resposta_correta, explicacao. */
  @Column({ type: 'text' })
  questions: string;

  /** JSON (texto) com os dados da empresa: nome, o_que_faz, produtos_servicos, fundacao, cultura, fontes. */
  @Column({ type: 'text' })
  company: string;

  /** Nota da prova, de 0 a 10 (null até a prova ser enviada). */
  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true, transformer: numeric })
  score: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
