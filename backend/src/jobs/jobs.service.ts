import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumesService } from '../resumes/resumes.service.js';
import type { CreateJobDto, JobStatsDto, ListJobsQueryDto, UpdateJobDto } from './dto/job.dto.js';
import { Job, JobStage } from './job.entity.js';

export const DEFAULT_SEARCH_JOBS_WEBHOOK_URL = 'http://localhost:5678/webhook/search-jobs';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly searchWebhookUrl: string;
  private readonly searchWebhookTimeoutMs: number;

  constructor(
    @InjectRepository(Job) private readonly repo: Repository<Job>,
    private readonly resumes: ResumesService,
    config: ConfigService,
  ) {
    this.searchWebhookUrl = config.get('N8N_SEARCH_JOBS_WEBHOOK_URL') || DEFAULT_SEARCH_JOBS_WEBHOOK_URL;
    this.searchWebhookTimeoutMs = Number(config.get('N8N_SEARCH_JOBS_WEBHOOK_TIMEOUT_MS')) || 60_000;
  }

  /**
   * Pede ao n8n para buscar vagas para o currículo escolhido. Envia
   * multipart/form-data com os campos (no n8n chegam em `body`):
   * - fileName: caminho do arquivo dentro da pasta de currículos (`/curriculos/<userId>/<arquivo>`)
   * - user_id, resume_id
   * Retorna a resposta do webhook.
   */
  async search(userId: string, resumeId: string): Promise<unknown> {
    const resume = await this.resumes.findOne(userId, resumeId);

    const form = new FormData();
    form.append('fileName', `/curriculos/${resume.storageKey}`);
    form.append('user_id', userId);
    form.append('resume_id', resume.id);

    let response: Response;
    try {
      response = await fetch(this.searchWebhookUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(this.searchWebhookTimeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao contatar o webhook de busca de vagas (${this.searchWebhookUrl}): ${String(error)}`);
      throw new BadGatewayException('Não foi possível iniciar a busca de vagas. Tente novamente.');
    }

    const body = await response.text();
    if (!response.ok) {
      this.logger.error(`Webhook de busca de vagas respondeu ${response.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException('O serviço de busca de vagas retornou um erro.');
    }
    if (!body) return { received: true };
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return { message: body };
    }
  }

  /** Ordenado por aderência, como na lista "Vagas recomendadas". */
  list(userId: string, query: ListJobsQueryDto): Promise<Job[]> {
    const qb = this.repo
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId })
      .orderBy('job.match', 'DESC')
      .addOrderBy('job.createdAt', 'DESC');

    if (query.stage) qb.andWhere('job.stage = :stage', { stage: query.stage });
    if (query.minMatch !== undefined) qb.andWhere('job.match >= :minMatch', { minMatch: query.minMatch });
    if (query.search) {
      const term = `%${query.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      qb.andWhere(
        `(job.company ILIKE :term OR job.role ILIKE :term OR job.location ILIKE :term
          OR array_to_string(job.tags, ' ') ILIKE :term)`,
        { term },
      );
    }
    return qb.getMany();
  }

  async stats(userId: string): Promise<JobStatsDto> {
    const rows: { stage: JobStage; count: string; sum: string }[] = await this.repo
      .createQueryBuilder('job')
      .select('job.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(job.match)', 'sum')
      .where('job.userId = :userId', { userId })
      .groupBy('job.stage')
      .getRawMany();

    const byStage = Object.fromEntries(Object.values(JobStage).map((s) => [s, 0])) as Record<JobStage, number>;
    let total = 0;
    let matchSum = 0;
    for (const row of rows) {
      byStage[row.stage] = Number(row.count);
      total += Number(row.count);
      matchSum += Number(row.sum);
    }

    return {
      total,
      averageMatch: total ? Math.round(matchSum / total) : 0,
      applied: total - byStage.found,
      interviews: byStage.interview + byStage.offer,
      byStage,
    };
  }

  async findOne(userId: string, id: string): Promise<Job> {
    const job = await this.repo.findOneBy({ id, userId });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  create(userId: string, dto: CreateJobDto): Promise<Job> {
    return this.repo.save(
      this.repo.create({
        ...dto,
        userId,
        tags: dto.tags ?? [],
        stage: dto.stage ?? JobStage.Found,
        link: dto.link ?? null,
        postedAt: dto.postedAt ?? null,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(userId, id);
    Object.assign(job, dto);
    return this.repo.save(job);
  }

  /** Só altera a etapa do pipeline (status da candidatura). */
  async updateStage(userId: string, id: string, stage: JobStage): Promise<Job> {
    const result = await this.repo.update({ id, userId }, { stage });
    if (!result.affected) throw new NotFoundException('Vaga não encontrada.');
    return this.repo.findOneByOrFail({ id, userId });
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Vaga não encontrada.');
  }
}
