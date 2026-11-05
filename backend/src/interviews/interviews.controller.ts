import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import { MAX_AUDIO_SIZE } from './audio-file.js';
import {
  FinishInterviewResponseDto,
  InterviewAnswerResponseDto,
  InterviewResponseDto,
  SaveAnswerDto,
  StartInterviewDto,
} from './dto/interview.dto.js';
import { InterviewsService } from './interviews.service.js';

@ApiTags('interviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Inicia uma simulação de entrevista para a vaga' })
  @ApiCreatedResponse({ type: InterviewResponseDto })
  @ApiNotFoundResponse({ description: 'Vaga não encontrada.' })
  async start(@CurrentUser() user: User, @Body() dto: StartInterviewDto): Promise<InterviewResponseDto> {
    return InterviewResponseDto.from(await this.interviews.start(user.id, dto.jobId));
  }

  @Get(':id')
  @ApiOkResponse({ type: InterviewResponseDto })
  @ApiNotFoundResponse()
  async findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<InterviewResponseDto> {
    return InterviewResponseDto.from(await this.interviews.findOne(user.id, id));
  }

  @Post(':id/answers')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AUDIO_SIZE, files: 1 } }))
  @ApiOperation({ summary: 'Salva o áudio de uma resposta (regravar a mesma pergunta substitui)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'questionIndex', 'question', 'durationMs'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'WebM, Ogg, MP4, WAV ou MP3, até 5 MB.' },
        questionIndex: { type: 'integer', minimum: 0 },
        question: { type: 'string' },
        durationMs: { type: 'integer', minimum: 0 },
      },
    },
  })
  @ApiCreatedResponse({ type: InterviewAnswerResponseDto })
  @ApiBadRequestResponse({ description: 'Áudio ausente, vazio ou em formato não suportado.' })
  @ApiPayloadTooLargeResponse({ description: 'Áudio maior que 5 MB.' })
  @ApiConflictResponse({ description: 'A entrevista já foi finalizada.' })
  @ApiNotFoundResponse()
  async saveAnswer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<InterviewAnswerResponseDto> {
    return InterviewAnswerResponseDto.from(await this.interviews.saveAnswer(user.id, id, dto, file));
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finaliza a entrevista e envia os áudios ao n8n',
    description:
      'Chame de novo para reenviar se `delivery` vier "failed" ou "pending". Sem N8N_INTERVIEW_WEBHOOK_URL nada é enviado.',
  })
  @ApiOkResponse({ type: FinishInterviewResponseDto })
  @ApiBadRequestResponse({ description: 'Nenhuma resposta gravada.' })
  @ApiNotFoundResponse()
  async finish(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<FinishInterviewResponseDto> {
    const { interview, delivery } = await this.interviews.finish(user.id, id);
    return { ...InterviewResponseDto.from(interview), delivery };
  }
}
