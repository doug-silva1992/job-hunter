import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entrevista técnica gerada pelo fluxo "Technical Interview" do n8n (tabela "technical_interview",
 * migration CreateTechnicalInterview). O backend só lê; quem grava é o n8n.
 * Mapeia só as colunas usadas pelo backend.
 */
@Entity('technical_interview')
export class TechnicalInterview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'interview_id', type: 'uuid', nullable: true })
  interviewId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'text', nullable: true })
  cargo: string | null;

  @Column({ name: 'pergunta_1', type: 'text', nullable: true })
  pergunta1: string | null;

  @Column({ name: 'pergunta_2', type: 'text', nullable: true })
  pergunta2: string | null;

  @Column({ name: 'pergunta_3', type: 'text', nullable: true })
  pergunta3: string | null;

  @Column({ name: 'pergunta_4', type: 'text', nullable: true })
  pergunta4: string | null;

  @Column({ name: 'pergunta_5', type: 'text', nullable: true })
  pergunta5: string | null;

  @Column({ name: 'pergunta_6', type: 'text', nullable: true })
  pergunta6: string | null;

  @Column({ type: 'text', default: 'processando' })
  status: string;
}
