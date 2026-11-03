import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import type { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto, description: 'Dados do usuário autenticado.' })
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.from(user);
  }

  @Patch('me')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'E-mail ou nome de usuário já em uso.' })
  async update(@CurrentUser() user: User, @Body() dto: UpdateMeDto): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.updateMe(user.id, dto));
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Conta, currículos e vagas excluídos.' })
  async remove(@CurrentUser() user: User): Promise<void> {
    await this.users.remove(user.id);
  }
}
