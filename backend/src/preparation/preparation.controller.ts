import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import { PreparationDto } from './dto/preparation.dto.js';
import { PreparationService } from './preparation.service.js';

@ApiTags('preparation')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('preparation')
export class PreparationController {
  constructor(private readonly preparation: PreparationService) {}

  @Post(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gera o preparatório da vaga: informações da empresa e questionário',
    description:
      'Envia a vaga ao webhook "preparatorio" do n8n (multipart/form-data) e devolve a resposta normalizada. Pode levar até alguns minutos.',
  })
  @ApiOkResponse({ type: PreparationDto })
  @ApiNotFoundResponse({ description: 'Vaga não encontrada.' })
  @ApiBadRequestResponse({ description: 'Você não é candidato à vaga (etapa Encontradas ou Rejeitados).' })
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível, retornou erro ou não devolveu perguntas.' })
  generate(@CurrentUser() user: User, @Param('jobId', ParseUUIDPipe) jobId: string): Promise<PreparationDto> {
    return this.preparation.generate(user, jobId);
  }
}
