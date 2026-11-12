import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStage } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import { grade, parseCompany, parseQuestions, toExam } from './preparation-exam.js';
import { Preparation } from './preparation.entity.js';

export const DEFAULT_PREPARATION_WEBHOOK_URL = 'http://localhost:5678/webhook-test/interview-prep';

/** Etapas do pipeline em que o usuário é candidato à vaga. */
const CANDIDATE_STAGES: JobStage[] = [JobStage.Applied, JobStage.Interview, JobStage.Offer];

/**
 * Tags separadas por vírgula, no formato que o fluxo "interview-prep" espera:
 * `.Net,C#,"data science",react` (entre aspas as que têm espaço, vírgula ou aspas).
 */
export function formatTags(tags: string[]): string {
  return tags
    .filter((t) => t.trim())
    .map((t) => (/[\s,"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t))
    .join(',');
}

/** Empresa preenchida (não vazia nem "Não informado") e ao menos uma tag. */
export function hasPreparationData(job: Pick<Job, 'company' | 'tags'>): boolean {
  const company = (job.company ?? '').trim();
  const normalized = company.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return !!company && normalized !== 'nao informado' && (job.tags ?? []).some((t) => t.trim());
}

@Injectable()
export class PreparationService {
  private readonly logger = new Logger(PreparationService.name);
  private readonly webhookUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    config: ConfigService,
    @InjectRepository(Preparation) private readonly preparations: Repository<Preparation>,
  ) {
    this.webhookUrl = config.get('N8N_PREPARATION_WEBHOOK_URL') || DEFAULT_PREPARATION_WEBHOOK_URL;
    this.timeoutMs = Number(config.get('N8N_PREPARATION_WEBHOOK_TIMEOUT_MS')) || 120_000;
  }

  /**
   * Envia a vaga ao fluxo "interview-prep" do n8n (multipart/form-data: empresa, tags, user_id e
   * job_id) e devolve a resposta do n8n como veio.
   */
  async generate(user: User, jobId: string): Promise<unknown> {
    const job = await this.jobs.findOneBy({ id: jobId, userId: user.id });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    if (!CANDIDATE_STAGES.includes(job.stage)) {
      throw new BadRequestException('O preparatório é só para vagas em que você é candidato.');
    }
    if (!hasPreparationData(job)) {
      throw new BadRequestException('O preparatório precisa da empresa e das tags da vaga.');
    }

    const form = new FormData();
    form.append('empresa', job.company);
    form.append('tags', formatTags(job.tags));
    form.append('user_id', user.id);
    form.append('job_id', job.id);

    return this.post(form);
  }

  /** Preparatório mais recente da vaga (gravado pelo n8n), com as perguntas sem a resposta certa. */
  async findExam(userId: string, jobId: string) {
    const prep = await this.latest(userId, jobId);
    return {
      id: prep.id,
      jobId: prep.jobId,
      company: parseCompany(prep.company),
      questions: toExam(parseQuestions(prep.questions)),
      score: prep.score,
      createdAt: prep.createdAt,
      updatedAt: prep.updatedAt,
    };
  }

  /** Corrige a prova, grava a nota (0 a 10) na coluna score e devolve o gabarito. */
  async submitExam(userId: string, jobId: string, preparationId: string, answers: Record<string, string>) {
    const prep = await this.preparations.findOneBy({ id: preparationId, userId, jobId });
    if (!prep) throw new NotFoundException('Preparatório não encontrado.');
    const result = grade(parseQuestions(prep.questions), answers);
    await this.preparations.update({ id: prep.id }, { score: result.score });
    return result;
  }

  private async latest(userId: string, jobId: string): Promise<Preparation> {
    const prep = await this.preparations.findOne({ where: { userId, jobId }, order: { createdAt: 'DESC' } });
    if (!prep) throw new NotFoundException('Nenhum preparatório gerado para esta vaga.');
    return prep;
  }

  private async post(form: FormData): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao contatar o webhook do preparatório (${this.webhookUrl}): ${String(error)}`);
      throw new BadGatewayException('Não foi possível gerar o preparatório. Tente novamente.');
    }
    const text = await response.text();
    if (!response.ok) {
      this.logger.error(`Webhook do preparatório respondeu ${response.status}: ${text.slice(0, 500)}`);
      throw new BadGatewayException('O serviço de preparatório do n8n retornou um erro.');
    }
    try {
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return text;
    }
  }
}
