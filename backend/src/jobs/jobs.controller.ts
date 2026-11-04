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
  CreateJobDto,
  JobResponseDto,
  JobStatsDto,
  ListJobsQueryDto,
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
