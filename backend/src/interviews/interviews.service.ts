import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Job } from '../jobs/job.entity.js';
import type { User } from '../users/user.entity.js';
import { inspectAudio } from './audio-file.js';
import { QUESTION_COUNT } from './dto/interview-report.dto.js';
import { InterviewReport } from './interview-report.entity.js';
import { TechnicalInterview } from './technical-interview.entity.js';

export const DEFAULT_INTERVIEW_WEBHOOK_URL = 'http://localhost:5678/webhook-test/interview_training';
export const DEFAULT_TECHNICAL_WEBHOOK_URL = 'http://localhost:5678/webhook-test/technical_interview';

type Webhook = { url: string; timeoutMs: number; label: string };

export type AudioFiles = Partial<Record<string, Express.Multer.File[]>>;

/** Campos multipart dos áudios, iguais aos que o fluxo do n8n lê (`$binary.pergunta1`...). */
export const AUDIO_FIELDS = Array.from({ length: QUESTION_COUNT }, (_, i) => `pergunta${i + 1}`);

const AUDIO_NAME = /^resposta-(\d+)(\.[a-z0-9]+)$/;

const MIME_BY_EXT: Record<string, string> = {
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

@Injectable()
export class InterviewsService implements OnModuleInit {
  private readonly logger = new Logger(InterviewsService.name);
  private readonly audioDir: string;
  private readonly interviewWebhook: Webhook;
  private readonly technicalWebhook: Webhook;

  constructor(
    @InjectRepository(InterviewReport) private readonly reports: Repository<InterviewReport>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    config: ConfigService,
    @InjectRepository(TechnicalInterview) private readonly technicals: Repository<TechnicalInterview>,
  ) {
    this.audioDir = resolve(config.get('INTERVIEW_AUDIO_DIR', 'storage/entrevistas'));
    this.interviewWebhook = {
      url: config.get('N8N_INTERVIEW_WEBHOOK_URL') || DEFAULT_INTERVIEW_WEBHOOK_URL,
      timeoutMs: Number(config.get('N8N_INTERVIEW_WEBHOOK_TIMEOUT_MS')) || 180_000,
      label: 'entrevista',
    };
    this.technicalWebhook = {
      url: config.get('N8N_TECHNICAL_INTERVIEW_WEBHOOK_URL') || DEFAULT_TECHNICAL_WEBHOOK_URL,
      timeoutMs: Number(config.get('N8N_TECHNICAL_INTERVIEW_WEBHOOK_TIMEOUT_MS')) || 120_000,
      label: 'entrevista técnica',
    };
  }

  async onModuleInit() {
    await mkdir(this.audioDir, { recursive: true });
  }

  list(userId: string): Promise<InterviewReport[]> {
    return this.reports.find({ where: { userId }, relations: { job: true }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, id: string): Promise<InterviewReport> {
    const report = await this.reports.findOne({ where: { id, userId }, relations: { job: true } });
    if (!report) throw new NotFoundException('Relatório de entrevista não encontrado.');
    return report;
  }

  /** Entrevista técnica mais recente (com perguntas) gerada a partir do relatório, se houver. */
  findTechnical(userId: string, interviewId: string): Promise<TechnicalInterview | null> {
    return this.technicals.findOne({
      where: { userId, interviewId, pergunta1: Not(IsNull()) },
      order: { createdAt: 'DESC' },
    });
  }

  /** Perguntas que têm áudio salvo em <userId>/<relatórioId>/. */
  async savedAudios(report: InterviewReport): Promise<Set<number>> {
    return new Set((await this.audioFiles(report)).keys());
  }

  async openAudio(userId: string, id: string, question: number): Promise<{ stream: ReadStream; mimeType: string }> {
    const report = await this.findOne(userId, id);
    const file = (await this.audioFiles(report)).get(question);
    if (!file) throw new NotFoundException('Áudio não encontrado.');
    const ext = file.slice(file.lastIndexOf('.'));
    return {
      stream: createReadStream(join(this.folder(report.userId, report.id), file)),
      mimeType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
    };
  }

  /**
   * Salva os 4 áudios e os envia ao webhook "interview_training" do n8n (multipart/form-data):
   * - campos: cargo, requisitos, nome, email, user_id (+ empresa, job_id)
   * - arquivos: pergunta1..pergunta4
   * O n8n avalia com o Gemini, grava a linha em "interviews" e responde com ela; a pasta dos
   * áudios passa a se chamar como o id do relatório. Se algo falhar, os áudios salvos são apagados
   * (continuam no navegador para tentar de novo).
   */
  async submit(user: User, jobId: string, files: AudioFiles): Promise<InterviewReport> {
    const audios = AUDIO_FIELDS.map((field, i) => {
      const file = files[field]?.[0];
      if (!file) throw new BadRequestException(`Envie o áudio da pergunta ${i + 1} no campo "${field}".`);
      const audio = inspectAudio(file.buffer);
      if (typeof audio === 'string') throw new BadRequestException(`Pergunta ${i + 1}: ${audio}`);
      return { field, n: i + 1, buffer: file.buffer, ...audio };
    });

    const job = await this.jobs.findOneBy({ id: jobId, userId: user.id });
    if (!job) throw new NotFoundException('Vaga não encontrada.');

    const tempFolder = this.folder(user.id, `envio-${randomUUID()}`);
    await mkdir(tempFolder, { recursive: true });
    await Promise.all(audios.map((a) => writeFile(join(tempFolder, `resposta-${a.n}${a.extension}`), a.buffer)));

    try {
      const form = new FormData();
      form.append('cargo', job.role);
      form.append('requisitos', job.tags.join(', '));
      form.append('nome', user.username);
      form.append('email', user.email);
      form.append('user_id', user.id);
      form.append('empresa', job.company);
      form.append('job_id', job.id);
      for (const a of audios) {
        form.append(a.field, new Blob([new Uint8Array(a.buffer)], { type: a.mimeType }), `Resposta${a.n}${a.extension}`);
      }

      const startedAt = new Date(Date.now() - 5_000);
      const body = await this.postToN8n(this.interviewWebhook, form);
      const report = await this.findCreatedReport(user.id, body, startedAt);

      await rename(tempFolder, this.folder(user.id, report.id));
      await this.reports.update({ id: report.id }, { jobId: job.id });
      return this.findOne(user.id, report.id);
    } catch (error) {
      await rm(tempFolder, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Pede ao fluxo "Technical Interview" do n8n (webhook technical_interview) as 6 perguntas técnicas,
   * a partir do relatório. multipart/form-data: user_id, interview_id, job_id, nome, email, cargo,
   * requisitos e descricao (texto digitado na modal). O n8n grava em "technical_interview" e responde
   * { sucesso, interview_id, cargo, nivel, perguntas }, que é devolvido como veio.
   */
  async requestTechnical(user: User, id: string, descricao: string): Promise<unknown> {
    const report = await this.findOne(user.id, id);
    const form = new FormData();
    form.append('user_id', user.id);
    form.append('interview_id', report.id);
    // sem vaga ligada (relatórios antigos) o campo não vai: o n8n grava null
    if (report.jobId) form.append('job_id', report.jobId);
    form.append('nome', user.username);
    form.append('email', user.email);
    form.append('cargo', report.cargo ?? report.job?.role ?? '');
    if (report.requisitos) form.append('requisitos', report.requisitos);
    form.append('descricao', descricao);
    return (await this.postToN8n(this.technicalWebhook, form)) ?? { sucesso: true };
  }

  async remove(userId: string, id: string): Promise<void> {
    const report = await this.findOne(userId, id);
    await this.reports.delete({ id: report.id, userId });
    await rm(this.folder(userId, report.id), { recursive: true, force: true }).catch((error: unknown) =>
      this.logger.warn(`Não foi possível apagar os áudios da entrevista ${report.id}: ${String(error)}`),
    );
  }

  /** Apaga os áudios do usuário (usado ao excluir a conta). */
  async deleteUserFolder(userId: string): Promise<void> {
    await rm(join(this.audioDir, userId), { recursive: true, force: true }).catch((error: unknown) =>
      this.logger.warn(`Não foi possível apagar os áudios do usuário ${userId}: ${String(error)}`),
    );
  }

  private async postToN8n(webhook: Webhook, form: FormData): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(webhook.url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(webhook.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao contatar o webhook de ${webhook.label} (${webhook.url}): ${String(error)}`);
      throw new BadGatewayException(`Não foi possível enviar a ${webhook.label} ao n8n. Tente novamente.`);
    }
    const text = await response.text();
    if (!response.ok) {
      this.logger.error(`Webhook de ${webhook.label} respondeu ${response.status}: ${text.slice(0, 500)}`);
      throw new BadGatewayException(`O serviço de ${webhook.label} do n8n retornou um erro.`);
    }
    try {
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return null;
    }
  }

  /** O n8n responde com a linha inserida; se não vier o id, pega a mais recente criada durante o envio. */
  private async findCreatedReport(userId: string, body: unknown, since: Date): Promise<InterviewReport> {
    const row = (Array.isArray(body) ? body[0] : body) as { id?: unknown } | null;
    const id = typeof row?.id === 'string' ? row.id : null;
    const report = id
      ? await this.reports.findOneBy({ id, userId })
      : await this.reports.findOne({ where: { userId, createdAt: MoreThanOrEqual(since) }, order: { createdAt: 'DESC' } });
    if (!report) {
      this.logger.error(`Webhook de entrevista respondeu sem um relatório do usuário ${userId}: ${JSON.stringify(body)?.slice(0, 300)}`);
      throw new BadGatewayException('A análise terminou, mas o relatório não foi encontrado.');
    }
    return report;
  }

  private folder(userId: string, name: string): string {
    return join(this.audioDir, userId, name);
  }

  private async audioFiles(report: InterviewReport): Promise<Map<number, string>> {
    const names = await readdir(this.folder(report.userId, report.id)).catch(() => [] as string[]);
    const files = new Map<number, string>();
    for (const name of names) {
      const match = AUDIO_NAME.exec(name);
      if (match) files.set(Number(match[1]), name);
    }
    return files;
  }
}
