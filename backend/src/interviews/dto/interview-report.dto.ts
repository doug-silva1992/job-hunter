import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { InterviewReport } from '../interview-report.entity.js';

/** Quantidade de perguntas do roteiro (o fluxo do n8n espera pergunta1..pergunta4). */
export const QUESTION_COUNT = 4;

export class SubmitInterviewDto {
  @ApiProperty({ format: 'uuid', description: 'Vaga da simulação.' })
  @IsUUID()
  jobId: string;
}

export class InterviewAnswerDto {
  @ApiProperty({ example: 1, description: 'Número da pergunta (1 a 4).' })
  pergunta: number;

  @ApiProperty({ type: Number, nullable: true, example: 7 })
  nota: number | null;

  @ApiProperty({ type: String, nullable: true })
  pontosFortes: string | null;

  @ApiProperty({ type: String, nullable: true })
  melhorias: string | null;

  @ApiProperty({ type: String, nullable: true })
  respostaIdeal: string | null;

  @ApiProperty({ description: 'Há áudio salvo no backend (GET /api/interviews/:id/audio/:pergunta).' })
  hasAudio: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Link do áudio gravado pelo n8n.' })
  externalAudioUrl: string | null;
}

export class InterviewReportSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  jobId: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Acme' })
  company: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Desenvolvedor C#' })
  cargo: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Laravel' })
  requisitos: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 6.5, description: 'Nota geral de 0 a 10.' })
  notaGeral: number | null;

  @ApiProperty({ type: String, nullable: true })
  resumo: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'concluida' })
  status: string | null;

  @ApiProperty()
  createdAt: Date;

  static from(r: InterviewReport): InterviewReportSummaryDto {
    return {
      id: r.id,
      jobId: r.jobId,
      company: r.job?.company ?? null,
      cargo: r.cargo,
      requisitos: r.requisitos,
      notaGeral: r.notaGeral,
      resumo: r.resumo,
      status: r.status,
      createdAt: r.createdAt,
    };
  }
}

export class InterviewReportDto extends InterviewReportSummaryDto {
  @ApiProperty({ type: String, nullable: true })
  candidatoNome: string | null;

  @ApiProperty({ type: String, nullable: true })
  recomendacao: string | null;

  @ApiProperty({ type: [InterviewAnswerDto] })
  respostas: InterviewAnswerDto[];

  /** `audios` = perguntas com áudio salvo no backend. */
  static fromReport(r: InterviewReport, audios: Set<number>): InterviewReportDto {
    const notas = [r.nota1, r.nota2, r.nota3, r.nota4];
    const urls = [r.audioUrl1, r.audioUrl2, r.audioUrl3, r.audioUrl4];
    const evaluated = r.avaliacao?.respostas ?? [];
    const respostas = Array.from({ length: QUESTION_COUNT }, (_, i): InterviewAnswerDto => {
      const n = i + 1;
      const e = evaluated.find((a) => a.pergunta === n) ?? evaluated[i];
      return {
        pergunta: n,
        nota: notas[i] ?? (typeof e?.nota === 'number' ? e.nota : null),
        pontosFortes: e?.pontos_fortes || null,
        melhorias: e?.melhorias || null,
        respostaIdeal: e?.resposta_ideal_resumida || null,
        hasAudio: audios.has(n),
        externalAudioUrl: urls[i] || null,
      };
    });
    return {
      ...InterviewReportSummaryDto.from(r),
      resumo: r.resumo ?? r.avaliacao?.avaliacao_geral?.resumo ?? null,
      notaGeral: r.notaGeral ?? r.avaliacao?.avaliacao_geral?.nota ?? null,
      candidatoNome: r.candidatoNome,
      recomendacao: r.recomendacao ?? r.avaliacao?.avaliacao_geral?.recomendacao ?? null,
      respostas,
    };
  }
}
