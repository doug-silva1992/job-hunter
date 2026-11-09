import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumesService } from '../resumes/resumes.service.js';
import type { Resume } from '../resumes/resume.entity.js';
import type { CreateJobDto, CreateManualJobDto, JobStatsDto, ListJobsQueryDto, UpdateJobDto } from './dto/job.dto.js';
import { Job, JobStage } from './job.entity.js';

export const DEFAULT_SEARCH_JOBS_WEBHOOK_URL = 'http://localhost:5678/webhook-test/search-jobs';
export const DEFAULT_JOB_ATS_WEBHOOK_URL = 'http://localhost:5678/webhook-test/job-ats';

/**
 * Extrai o objeto da análise da resposta do n8n. Aceita o objeto direto, uma lista com ele
 * (`[{...}]`, padrão do "Respond to Webhook") ou `{ output: ... }` (nó AI Agent), inclusive
 * com o JSON em texto, cercado ou não por ```json.
 */
export function parseAtsResponse(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(value)) {
      value = value[0];
      continue;
    }
    if (typeof value === 'string') {
      const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try {
        value = JSON.parse(text) as unknown;
      } catch {
        return null;
      }
      continue;
    }
    if (value && typeof value === 'object' && 'output' in value && !('atsScore' in value)) {
      value = (value as { output: unknown }).output;
      continue;
    }
    break;
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Nota de 0 a 100 (número ou texto numérico), ou null se ausente/inválida. */
export function atsScoreOf(ats: Record<string, unknown>): number | null {
  const score = typeof ats.atsScore === 'string' ? Number(ats.atsScore.replace(',', '.')) : ats.atsScore;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly searchWebhookUrl: string;
  private readonly searchWebhookTimeoutMs: number;
  private readonly atsWebhookUrl: string;
  private readonly atsWebhookTimeoutMs: number;

  constructor(
    @InjectRepository(Job) private readonly repo: Repository<Job>,
    private readonly resumes: ResumesService,
    config: ConfigService,
  ) {
    this.searchWebhookUrl = config.get('N8N_SEARCH_JOBS_WEBHOOK_URL') || DEFAULT_SEARCH_JOBS_WEBHOOK_URL;
    this.searchWebhookTimeoutMs = Number(config.get('N8N_SEARCH_JOBS_WEBHOOK_TIMEOUT_MS')) || 60_000;
    this.atsWebhookUrl = config.get('N8N_JOB_ATS_WEBHOOK_URL') || DEFAULT_JOB_ATS_WEBHOOK_URL;
    this.atsWebhookTimeoutMs = Number(config.get('N8N_JOB_ATS_WEBHOOK_TIMEOUT_MS')) || 120_000;
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

  /**
   * Cadastra uma vaga informada pelo usuário e já pede a análise de ATS (vaga x currículo).
   * A vaga é salva antes (aderência 0) para não se perder se o n8n falhar; nesse caso
   * `atsError` explica o motivo e a análise pode ser refeita em POST /jobs/:id/ats.
   */
  async createManual(userId: string, dto: CreateManualJobDto): Promise<{ job: Job; atsError: string | null }> {
    const resume = await this.resumes.findOne(userId, dto.resumeId);
    const job = await this.repo.save(
      this.repo.create({
        userId,
        company: dto.company,
        role: dto.role,
        location: dto.location ?? '',
        workMode: dto.workMode,
        tags: dto.tags ?? [],
        stage: dto.stage ?? JobStage.Found,
        link: dto.link ?? null,
        postedAt: dto.postedAt ?? null,
        description: dto.description,
        resumeId: resume.id,
        match: 0,
        ats: null,
      }),
    );
    try {
      return { job: await this.applyAts(job, resume), atsError: null };
    } catch (error) {
      if (!(error instanceof BadGatewayException)) throw error;
      return { job, atsError: error.message };
    }
  }

  /** Refaz a análise de ATS da vaga com o currículo informado (ou o da última análise). */
  async analyze(userId: string, id: string, resumeId?: string): Promise<Job> {
    const job = await this.findOne(userId, id);
    if (!job.description?.trim()) {
      throw new BadRequestException('A vaga não tem descrição para comparar com o currículo.');
    }
    const targetId = resumeId ?? job.resumeId;
    if (!targetId) throw new BadRequestException('Informe o currículo (resumeId) para analisar a vaga.');
    return this.applyAts(job, await this.resumes.findOne(userId, targetId));
  }

  /**
   * Envia a vaga e o currículo ao webhook de ATS de vagas do n8n (JSON) e grava o resultado:
   * `ats` recebe o objeto devolvido e a aderência (`match`) passa a ser o `atsScore`.
   */
  private async applyAts(job: Job, resume: Resume): Promise<Job> {
    const payload = {
      user_id: job.userId,
      job_id: job.id,
      resume_id: resume.id,
      fileName: `/curriculos/${resume.storageKey}`,
      empresa: job.company,
      cargo: job.role,
      local: job.location,
      modalidade: job.workMode,
      tags: job.tags,
      link: job.link,
      descricao: job.description,
    };

    let response: Response;
    try {
      response = await fetch(this.atsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.atsWebhookTimeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao contatar o webhook de ATS de vagas (${this.atsWebhookUrl}): ${String(error)}`);
      throw new BadGatewayException('Não foi possível contatar o serviço de análise de ATS.');
    }

    const body = await response.text();
    if (!response.ok) {
      this.logger.error(`Webhook de ATS de vagas respondeu ${response.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException('O serviço de análise de ATS retornou um erro.');
    }

    const ats = parseAtsResponse(body);
    const score = ats && atsScoreOf(ats);
    if (!ats || score === null) {
      this.logger.error(`Webhook de ATS de vagas respondeu sem "atsScore": ${body.slice(0, 500)}`);
      throw new BadGatewayException('A análise de ATS voltou sem a nota (atsScore).');
    }

    job.ats = { ...ats, atsScore: score };
    job.match = score;
    job.resumeId = resume.id;
    return this.repo.save(job);
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
