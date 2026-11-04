import { ApiProperty } from '@nestjs/swagger';
import type { Resume } from '../resume.entity.js';

/** Converte o texto da coluna `ats` em objeto; vazio ou JSON inválido vira null. */
function parseAts(raw: string | null): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export class ResumeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'curriculo-frontend.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 182044 })
  sizeBytes: number;

  @ApiProperty({ description: 'Currículo principal do usuário (no máximo um).' })
  isPrimary: boolean;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Avaliação de ATS feita pelo n8n, ou null se ainda não avaliado.',
    example: {
      atsScore: 88,
      classificacao: 'Altamente Compatível',
      pontosFortes: ['...'],
      pontosFracos: ['...'],
      sugestoes: ['...'],
      tecnologiasIdentificadas: ['React', 'NestJS'],
    },
  })
  ats: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  static from(r: Resume): ResumeResponseDto {
    return {
      id: r.id,
      originalName: r.originalName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      isPrimary: r.isPrimary,
      ats: parseAts(r.ats),
      createdAt: r.createdAt,
    };
  }
}
