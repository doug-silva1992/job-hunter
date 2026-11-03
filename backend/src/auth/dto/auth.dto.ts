import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import {
  normalizeEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  trim,
  USERNAME_MESSAGE,
  USERNAME_REGEX,
} from '../../common/validation.js';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class LoginDto {
  @ApiProperty({ example: 'douglas@exemplo.com' })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'dougdev', description: '3 a 30 caracteres: letras, números, ".", "-" ou "_".' })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_MESSAGE })
  username: string;

  @ApiProperty({ example: 'douglas@exemplo.com' })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '123456', minLength: PASSWORD_MIN })
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX, {
    message: `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
  })
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT para o header `Authorization: Bearer <token>`.' })
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
