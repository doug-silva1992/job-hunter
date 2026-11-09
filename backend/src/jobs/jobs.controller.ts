import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../users/user.entity.js';
import {
  AnalyzeJobDto,
  CreateJobDto,
  CreateManualJobDto,
  JobResponseDto,
  ManualJobResponseDto,
  JobStatsDto,
  ListJobsQueryDto,
  SearchJobsDto,
  UpdateJobDto,
  UpdateJobStageDto,
} from './dto/job.dto.js';
import { JobsService } from './jobs.service.js';

@ApiTags('jobs')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as vagas do usuário, ordenadas por aderência' })
  @ApiOkResponse({ type: [JobResponseDto] })
  async list(@CurrentUser() user: User, @Query() query: ListJobsQueryDto): Promise<JobResponseDto[]> {
    return (await this.jobs.list(user.id, query)).map(JobResponseDto.from);
  }

  // declarado antes de ":id" para não ser capturado por ele
  @Get('stats')
  @ApiOperation({ summary: 'Métricas dos cards do Dashboard' })
  @ApiOkResponse({ type: JobStatsDto })
  stats(@CurrentUser() user: User): Promise<JobStatsDto> {
    return this.jobs.stats(user.id);
  }

  @Post('search')
  @ApiOperation({
    summary: 'Gera vagas a partir de um currículo',
    description:
      'Envia ao webhook de busca de vagas do n8n (multipart/form-data) os campos fileName, user_id e resume_id. Retorna a resposta do n8n.',
  })
  @ApiCreatedResponse({ description: 'Resposta do webhook do n8n.' })
  @ApiBadRequestResponse({ description: 'resumeId inválido.' })
  @ApiNotFoundResponse({ description: 'Currículo não encontrado.' })
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível ou retornou erro.' })
  search(@CurrentUser() user: User, @Body() dto: SearchJobsDto): Promise<unknown> {
    return this.jobs.search(user.id, dto.resumeId);
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Cadastra uma vaga manualmente e analisa o ATS dela com um currículo',
    description:
      'Salva a vaga e envia ao webhook de ATS de vagas do n8n (JSON) os dados da vaga, a descrição e o currículo. ' +
      'O `atsScore` devolvido vira a aderência (`match`). Se o n8n falhar, a vaga fica salva e `atsError` explica o motivo.',
  })
  @ApiCreatedResponse({ type: ManualJobResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Currículo não encontrado.' })
  async createManual(@CurrentUser() user: User, @Body() dto: CreateManualJobDto): Promise<ManualJobResponseDto> {
    const { job, atsError } = await this.jobs.createManual(user.id, dto);
    return { job: JobResponseDto.from(job), atsError };
  }

  @Post(':id/ats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refaz a análise de ATS da vaga (vaga x currículo)' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Vaga sem descrição ou sem currículo.' })
  @ApiNotFoundResponse({ description: 'Vaga ou currículo não encontrado.' })
  @ApiBadGatewayResponse({ description: 'O webhook do n8n está indisponível ou respondeu sem atsScore.' })
  async analyze(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnalyzeJobDto,
  ): Promise<JobResponseDto> {
    return JobResponseDto.from(await this.jobs.analyze(user.id, id, dto.resumeId));
  }

  @Get(':id')
  @ApiOkResponse({ type: JobResponseDto })
  @ApiNotFoundResponse()
  async findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<JobResponseDto> {
    return JobResponseDto.from(await this.jobs.findOne(user.id, id));
  }

  @Post()
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@CurrentUser() user: User, @Body() dto: CreateJobDto): Promise<JobResponseDto> {
    return JobResponseDto.from(await this.jobs.create(user.id, dto));
  }

  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Atualiza o status da vaga no Pipeline de candidaturas',
    description: 'Usado ao arrastar no kanban e no botão "Aplicar" (`{ "stage": "applied" }`).',
  })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Etapa inválida.' })
  @ApiNotFoundResponse()
  async updateStage(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStageDto,
  ): Promise<JobResponseDto> {
    return JobResponseDto.from(await this.jobs.updateStage(user.id, id, dto.stage));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados da vaga' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiNotFoundResponse()
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    return JobResponseDto.from(await this.jobs.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobs.remove(user.id, id);
  }
}
