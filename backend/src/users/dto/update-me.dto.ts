import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import {
  normalizeEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  trim,
  USERNAME_MESSAGE,
  USERNAME_REGEX,
} from '../../common/validation.js';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'dougdev' })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_MESSAGE })
  username?: string;

  @ApiPropertyOptional({ example: 'novo@exemplo.com', description: 'Exige `currentPassword`.' })
  @IsOptional()
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ minLength: PASSWORD_MIN, description: 'Exige `currentPassword`.' })
  @IsOptional()
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX, {
    message: `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
  })
  newPassword?: string;

  @ApiPropertyOptional({ description: 'Senha atual. Obrigatória para alterar e-mail ou senha.' })
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX)
  currentPassword?: string;
}
