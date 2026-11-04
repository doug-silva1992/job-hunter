import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import { SettingsDto, SettingsResponseDto } from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Preferências de busca e notificação (padrões se nunca foram salvas)' })
  @ApiOkResponse({ type: SettingsResponseDto })
  async get(@CurrentUser() user: User): Promise<SettingsResponseDto> {
    const { settings, saved } = await this.settings.get(user.id);
    return SettingsResponseDto.from(settings, saved);
  }

  @Put()
  @ApiOperation({ summary: 'Salva todas as preferências de uma vez' })
  @ApiOkResponse({ type: SettingsResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async save(@CurrentUser() user: User, @Body() dto: SettingsDto): Promise<SettingsResponseDto> {
    return SettingsResponseDto.from(await this.settings.save(user.id, dto), true);
  }
}
