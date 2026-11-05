import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { trim } from '../../common/validation.js';
import { InterviewStatus, type Interview, type InterviewAnswer } from '../interview.entity.js';

export const MAX_QUESTIONS = 50;
export const MAX_ANSWER_MS = 15 * 60 * 1000;

export class StartInterviewDto {
  @ApiProperty({ format: 'uuid', description: 'Vaga para a qual a entrevista é simulada.' })
  @IsUUID()
  jobId: string;
}

/** Campos de texto do multipart enviado junto com o áudio (campo "file"). */
export class SaveAnswerDto {
  @ApiProperty({ minimum: 0, maximum: MAX_QUESTIONS - 1, description: 'Ordem da pergunta (0, 1, 2...).' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTIONS - 1)
  questionIndex: number;

  @ApiProperty({ example: 'Me conte um pouco sobre você.', maxLength: 2000 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 2000)
  question: string;

  @ApiProperty({ example: 42000, description: 'Duração do áudio em milissegundos.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ANSWER_MS)
  durationMs: number;
}

export class InterviewAnswerResponseDto {
  @ApiProperty() questionIndex: number;
  @ApiProperty() question: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() durationMs: number;
  @ApiProperty() createdAt: Date;

  static from(a: InterviewAnswer): InterviewAnswerResponseDto {
    return {
      questionIndex: a.questionIndex,
      question: a.question,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      durationMs: a.durationMs,
      createdAt: a.createdAt,
    };
  }
}

export class InterviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) jobId: string;
  @ApiProperty({ enum: InterviewStatus, enumName: 'InterviewStatus' }) status: InterviewStatus;
  @ApiProperty({ type: [InterviewAnswerResponseDto] }) answers: InterviewAnswerResponseDto[];
  @ApiProperty({ nullable: true, type: Date }) finishedAt: Date | null;
  @ApiProperty({ nullable: true, type: Date }) sentAt: Date | null;
  @ApiProperty() createdAt: Date;

  static from(i: Interview): InterviewResponseDto {
    return {
      id: i.id,
      jobId: i.jobId,
      status: i.status,
      answers: [...(i.answers ?? [])].sort((a, b) => a.questionIndex - b.questionIndex).map(InterviewAnswerResponseDto.from),
      finishedAt: i.finishedAt,
      sentAt: i.sentAt,
      createdAt: i.createdAt,
    };
  }
}

/** sent = entregue ao n8n; pending = webhook não configurado; failed = n8n fora do ar ou com erro. */
export type Delivery = 'sent' | 'pending' | 'failed';

export class FinishInterviewResponseDto extends InterviewResponseDto {
  @ApiProperty({ enum: ['sent', 'pending', 'failed'], description: 'Resultado do envio dos áudios ao n8n.' })
  delivery: Delivery;
}
