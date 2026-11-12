import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';

export class SubmitExamDto {
  @ApiProperty({ format: 'uuid', description: 'Preparatório respondido (id da linha em "preparations").' })
  @IsUUID()
  preparationId: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { '1': 'B', '2': 'C' },
    description: 'Resposta de cada pergunta: { numero: letra }.',
  })
  @IsObject()
  answers: Record<string, string>;
}
