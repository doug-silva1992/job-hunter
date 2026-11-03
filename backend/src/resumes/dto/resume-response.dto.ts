import { ApiProperty } from '@nestjs/swagger';
import type { Resume } from '../resume.entity.js';

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

  @ApiProperty()
  createdAt: Date;

  static from(r: Resume): ResumeResponseDto {
    return {
      id: r.id,
      originalName: r.originalName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      isPrimary: r.isPrimary,
      createdAt: r.createdAt,
    };
  }
}
