import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStage } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import type { PreparationDto } from './dto/preparation.dto.js';
import { parsePreparation } from './preparation-response.js';

export const DEFAULT_PREPARATION_WEBHOOK_URL = 'http://localhost:5678/webhook-test/preparatorio';

/** Quantas perguntas o questionário pede ao n8n. */
export const QUIZ_SIZE = 10;

/** Etapas do pipeline em que o usuário é candidato à vaga. */
const CANDIDATE_STAGES: JobStage[] = [JobStage.Applied, JobStage.Interview, JobStage.Offer];

const WORK_MODES: Record<string, string> = { remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial' };

@Injectable()
export class PreparationService {
  private readonly logger = new Logger(PreparationService.name);
  private readonly webhookUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    config: ConfigService,
  ) {
    this.webhookUrl = config.get('N8N_PREPARATION_WEBHOOK_URL') || DEFAULT_PREPARATION_WEBHOOK_URL;
    this.timeoutMs = Number(config.get('N8N_PREPARATION_WEBHOOK_TIMEOUT_MS')) || 120_000;
  }

  /**
   * Pede ao fluxo "Preparatório" do n8n as informações da empresa e o questionário sobre a vaga.
   * multipart/form-data: user_id, job_id, nome, empresa, cargo, requisitos, localizacao,
   * modalidade, link e quantidade (perguntas). Nada é gravado: o conteúdo é gerado a cada pedido.
   */
  async generate(user: User, jobId: string): Promise<PreparationDto> {
    const job = await this.jobs.findOneBy({ id: jobId, userId: user.id });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    if (!CANDIDATE_STAGES.includes(job.stage)) {
      throw new BadRequestException('O preparatório é só para vagas em que você é candidato.');
    }

    const form = new FormData();
    form.append('user_id', user.id);
    form.append('job_id', job.id);
    form.append('nome', user.username);
    form.append('empresa', job.company);
    form.append('cargo', job.role);
    form.append('requisitos', job.tags.join(', '));
    form.append('localizacao', job.location);
    form.append('modalidade', WORK_MODES[job.workMode] ?? job.workMode);
    if (job.link) form.append('link', job.link);
    form.append('quantidade', String(QUIZ_SIZE));

    const body = await this.post(form);
    const { empresa, perguntas } = parsePreparation(body, job.company);
    if (perguntas.length === 0) {
      this.logger.error(`Preparatório sem perguntas válidas para a vaga ${job.id}: ${JSON.stringify(body)?.slice(0, 500)}`);
      throw new BadGatewayException('O n8n não devolveu um questionário válido. Tente gerar de novo.');
    }
    return { jobId: job.id, empresa, perguntas };
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
