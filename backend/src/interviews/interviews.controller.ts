import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import { MAX_AUDIO_SIZE } from './audio-file.js';
import {
  InterviewReportDto,
  InterviewReportSummaryDto,
  QUESTION_COUNT,
  SubmitInterviewDto,
  TechnicalInterviewRequestDto,
} from './dto/interview-report.dto.js';
import { AUDIO_FIELDS, InterviewsService, type AudioFiles } from './interviews.service.js';

@ApiTags('interviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Relatórios das simulações de entrevista (mais recentes primeiro)' })
  @ApiOkResponse({ type: [InterviewReportSummaryDto] })
  async list(@CurrentUser() user: User): Promise<InterviewReportSummaryDto[]> {
    return (await this.interviews.list(user.id)).map((r) => InterviewReportSummaryDto.from(r));
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      AUDIO_FIELDS.map((name) => ({ name, maxCount: 1 })),
      { limits: { fileSize: MAX_AUDIO_SIZE, files: QUESTION_COUNT } },
    ),
  )
  @ApiOperation({
    summary: 'Salva os áudios da simulação e envia ao n8n para avaliação',
    description:
      'Espera o fluxo "interview_training" do n8n avaliar (pode levar até alguns minutos) e devolve o relatório criado.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['jobId', ...AUDIO_FIELDS],
      properties: {
        jobId: { type: 'string', format: 'uuid' },
        ...Object.fromEntries(
          AUDIO_FIELDS.map((f, i) => [
            f,
            { type: 'string', format: 'binary', description: `Resposta da pergunta ${i + 1} (até 5 MB).` },
          ]),
        ),
      },
    },
  })
  @ApiCreatedResponse({ type: InterviewReportDto })
  @ApiBadRequestResponse({ description: 'Áudio ausente, vazio ou em formato não suportado.' })
  @ApiPayloadTooLargeResponse({ description: 'Algum áudio passa de 5 MB.' })
  @ApiNotFoundResponse({ description: 'Vaga não encontrada.' })
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível ou retornou erro.' })
  async submit(
    @CurrentUser() user: User,
    @Body() dto: SubmitInterviewDto,
    @UploadedFiles() files: AudioFiles | undefined,
  ): Promise<InterviewReportDto> {
    const report = await this.interviews.submit(user, dto.jobId, files ?? {});
    return InterviewReportDto.fromReport(report, await this.interviews.savedAudios(report));
  }

  @Get(':id')
  @ApiOkResponse({ type: InterviewReportDto })
  @ApiNotFoundResponse()
  async findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<InterviewReportDto> {
    const report = await this.interviews.findOne(user.id, id);
    const [audios, technical] = await Promise.all([
      this.interviews.savedAudios(report),
      this.interviews.findTechnical(user.id, report.id),
    ]);
    return InterviewReportDto.fromReport(report, audios, technical);
  }

  @Get(':id/audio/:question')
  @ApiOperation({ summary: 'Áudio salvo da resposta (pergunta 1 a 4)' })
  @ApiProduces('audio/*')
  @ApiOkResponse({ description: 'Arquivo de áudio.' })
  @ApiNotFoundResponse()
  async audio(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('question', ParseIntPipe) question: number,
  ): Promise<StreamableFile> {
    const { stream, mimeType } = await this.interviews.openAudio(user.id, id, question);
    return new StreamableFile(stream, { type: mimeType });
  }

  @Post(':id/technical')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gera a entrevista técnica a partir do relatório',
    description:
      'Envia ao webhook "technical_interview" do n8n (multipart/form-data: user_id, interview_id, job_id, nome, email, cargo, requisitos, descricao) e devolve a resposta do n8n.',
  })
  @ApiOkResponse({
    description: 'Resposta do n8n.',
    schema: { example: { sucesso: true, interview_id: 'uuid', cargo: 'Tech Lead', nivel: 'Sênior', perguntas: [{ pergunta: '...' }] } },
  })
  @ApiBadRequestResponse({ description: 'Descrição vazia ou longa demais.' })
  @ApiNotFoundResponse()
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível ou retornou erro.' })
  requestTechnical(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TechnicalInterviewRequestDto,
  ): Promise<unknown> {
    return this.interviews.requestTechnical(user, id, dto.descricao);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Relatório e áudios removidos.' })
  @ApiNotFoundResponse()
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.interviews.remove(user.id, id);
  }
}
