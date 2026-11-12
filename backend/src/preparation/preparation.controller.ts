import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
import { SubmitExamDto } from './dto/submit-exam.dto.js';
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
    summary: 'Gera o preparatório da vaga no n8n',
    description:
      'Envia a vaga ao webhook "interview-prep" do n8n (multipart/form-data: empresa, tags, user_id, job_id) e devolve a resposta do n8n como veio.',
  })
  @ApiOkResponse({ description: 'Resposta do n8n, sem alterações.' })
  @ApiNotFoundResponse({ description: 'Vaga não encontrada.' })
  @ApiBadRequestResponse({ description: 'Você não é candidato à vaga (etapa Encontradas ou Rejeitados).' })
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível ou retornou erro.' })
  generate(@CurrentUser() user: User, @Param('jobId', ParseUUIDPipe) jobId: string): Promise<unknown> {
    return this.preparation.generate(user, jobId);
  }

  @Get(':jobId')
  @ApiOperation({
    summary: 'Preparatório mais recente da vaga (prova sem o gabarito)',
    description: 'Lê a linha de "preparations" gravada pelo n8n. As perguntas vêm sem resposta_correta e explicacao.',
  })
  @ApiOkResponse({ description: '{ id, jobId, company, questions, score, createdAt, updatedAt }' })
  @ApiNotFoundResponse({ description: 'Nenhum preparatório gerado para esta vaga.' })
  findExam(@CurrentUser() user: User, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.preparation.findExam(user.id, jobId);
  }

  @Post(':jobId/answers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envia a prova: corrige, grava a nota (0 a 10) em score e devolve o gabarito',
  })
  @ApiOkResponse({ description: '{ score, acertos, total, resultado: [{ numero, resposta, correta, acertou, explicacao }] }' })
  @ApiNotFoundResponse({ description: 'Preparatório não encontrado.' })
  submitExam(@CurrentUser() user: User, @Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: SubmitExamDto) {
    return this.preparation.submitExam(user.id, jobId, dto.preparationId, dto.answers);
  }
}
