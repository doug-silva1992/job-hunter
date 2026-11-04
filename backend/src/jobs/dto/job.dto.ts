import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsUrl,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../../common/validation.js';
import { JobStage, WorkMode, type Job } from '../job.entity.js';

const trimTags = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.map((t) => (typeof t === 'string' ? t.trim() : t)))] : value;

export class CreateJobDto {
  @ApiProperty({ example: 'Acme Pay', maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 120)
  company: string;

  @ApiProperty({ example: 'Senior Frontend Engineer', maxLength: 160 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 160)
  role: string;

  @ApiProperty({ example: 'São Paulo, SP', maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 120)
  location: string;

  @ApiProperty({ enum: WorkMode, enumName: 'WorkMode', description: 'Remoto, Híbrido ou Presencial.' })
  @IsEnum(WorkMode)
  workMode: WorkMode;

  @ApiProperty({ example: 94, minimum: 0, maximum: 100, description: 'Aderência ao perfil (%).' })
  @IsInt()
  @Min(0)
  @Max(100)
  match: number;

  @ApiPropertyOptional({ example: ['React', 'TypeScript'], maxItems: 20 })
  @IsOptional()
  @Transform(({ value }) => trimTags(value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: JobStage, enumName: 'JobStage', default: JobStage.Found })
  @IsOptional()
  @IsEnum(JobStage)
  stage?: JobStage;

  @ApiPropertyOptional({ example: 'https://empresa.gupy.io/job/123', nullable: true, description: 'Página da vaga.' })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'O link deve ser uma URL http(s).' })
  @MaxLength(2048)
  link?: string | null;

  @ApiPropertyOptional({ example: '2026-11-03T12:00:00.000Z', nullable: true, description: 'Data de publicação da vaga.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  postedAt?: Date | null;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}

/** Corpo do PATCH /jobs/:id/stage (mover no Pipeline de candidaturas). */
export class UpdateJobStageDto {
  @ApiProperty({ enum: JobStage, enumName: 'JobStage', example: JobStage.Applied })
  @IsEnum(JobStage)
  stage: JobStage;
}

export class ListJobsQueryDto {
  @ApiPropertyOptional({ enum: JobStage, enumName: 'JobStage', description: 'Filtra por coluna do kanban.' })
  @IsOptional()
  @IsEnum(JobStage)
  stage?: JobStage;

  @ApiPropertyOptional({ example: 70, minimum: 0, maximum: 100, description: 'Só vagas com aderência maior ou igual a este valor (%).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minMatch?: number;

  @ApiPropertyOptional({ example: 'react', description: 'Busca em empresa, cargo, local e tags.' })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class JobResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() company: string;
  @ApiProperty() role: string;
  @ApiProperty() location: string;
  @ApiProperty({ enum: WorkMode, enumName: 'WorkMode' }) workMode: WorkMode;
  @ApiProperty({ minimum: 0, maximum: 100 }) match: number;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ enum: JobStage, enumName: 'JobStage' }) stage: JobStage;
  @ApiProperty({ nullable: true, type: String, description: 'Página da vaga.' }) link: string | null;
  @ApiProperty({ nullable: true, type: Date }) postedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(job: Job): JobResponseDto {
    return {
      id: job.id,
      company: job.company,
      role: job.role,
      location: job.location,
      workMode: job.workMode,
      match: job.match,
      tags: job.tags,
      stage: job.stage,
      link: job.link,
      postedAt: job.postedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

/** Números dos cards do Dashboard. */
export class JobStatsDto {
  @ApiProperty({ description: 'Vagas Encontradas (total).' }) total: number;
  @ApiProperty({ description: 'Match Médio (%), arredondado.' }) averageMatch: number;
  @ApiProperty({ description: 'Currículos Enviados (etapa diferente de "found").' }) applied: number;
  @ApiProperty({ description: 'Entrevistas (etapas "interview" e "offer").' }) interviews: number;
  @ApiProperty({
    description: 'Quantidade por coluna do kanban.',
    example: { found: 6, applied: 3, interview: 2, offer: 1 },
  })
  byStage: Record<JobStage, number>;
}
