import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkMode } from '../../jobs/job.entity.js';
import { Seniority, type UserSettings } from '../user-settings.entity.js';

export const JOB_AGE_OPTIONS = [1, 3, 7, 15, 30, 60, 90];
const LIST_MAX = 30;
const ITEM_MAX = 60;

/** Remove espaços, itens vazios e duplicados (sem diferenciar maiúsculas). */
export function cleanList(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      result.push(item);
      continue;
    }
    const text = item.trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
  }
  return result;
}

/** Lista de textos livres (palavras-chave, locais...). */
function TextList(): PropertyDecorator {
  return (target, key) => {
    Transform(({ value }) => cleanList(value))(target, key);
    IsArray()(target, key);
    ArrayMaxSize(LIST_MAX, { message: `Use no máximo ${LIST_MAX} itens.` })(target, key);
    IsString({ each: true })(target, key);
    Length(1, ITEM_MAX, { each: true, message: `Cada item deve ter até ${ITEM_MAX} caracteres.` })(target, key);
  };
}

/** Todas as preferências; o PUT substitui o conjunto inteiro. */
export class SettingsDto {
  @ApiProperty({ example: 70, minimum: 0, maximum: 100, description: 'Compatibilidade mínima (%) das vagas buscadas.' })
  @IsInt()
  @Min(0)
  @Max(100)
  minMatch: number;

  @ApiProperty({ example: ['Frontend', 'React'], description: 'Cargos e palavras-chave priorizados.' })
  @TextList()
  keywords: string[];

  @ApiProperty({ example: ['PHP'], description: 'Termos ou empresas que descartam a vaga.' })
  @TextList()
  excludedKeywords: string[];

  @ApiProperty({ enum: Seniority, enumName: 'Seniority', isArray: true, description: 'Vazio = qualquer nível.' })
  @IsArray()
  @ArrayUnique()
  @IsEnum(Seniority, { each: true })
  seniority: Seniority[];

  @ApiProperty({ enum: WorkMode, enumName: 'WorkMode', isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos uma modalidade de trabalho.' })
  @ArrayUnique()
  @IsEnum(WorkMode, { each: true })
  workModes: WorkMode[];

  @ApiProperty({ example: ['São Paulo, SP'], description: 'Vazio = qualquer local.' })
  @TextList()
  locations: string[];

  @ApiProperty({ example: 8000, nullable: true, type: Number, description: 'Salário mensal mínimo (R$).' })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minSalary: number | null;

  @ApiProperty({ enum: JOB_AGE_OPTIONS, example: 30, description: 'Só vagas publicadas nos últimos N dias.' })
  @IsIn(JOB_AGE_OPTIONS)
  maxJobAgeDays: number;

  @ApiProperty({ description: 'Avisar por e-mail quando surgirem vagas compatíveis.' })
  @IsBoolean()
  notifyNewJobs: boolean;

  @ApiProperty({ description: 'Enviar um resumo semanal por e-mail.' })
  @IsBoolean()
  weeklySummary: boolean;
}

export class SettingsResponseDto extends SettingsDto {
  @ApiProperty({ nullable: true, type: Date, description: 'Null enquanto o usuário usa os valores padrão.' })
  updatedAt: Date | null;

  static from(s: UserSettings, saved: boolean): SettingsResponseDto {
    return {
      minMatch: s.minMatch,
      keywords: s.keywords,
      excludedKeywords: s.excludedKeywords,
      seniority: s.seniority,
      workModes: s.workModes,
      locations: s.locations,
      minSalary: s.minSalary,
      maxJobAgeDays: s.maxJobAgeDays,
      notifyNewJobs: s.notifyNewJobs,
      weeklySummary: s.weeklySummary,
      updatedAt: saved ? s.updatedAt : null,
    };
  }
}
