import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity.js';
import { inspectAudio } from './audio-file.js';
import type { Delivery, SaveAnswerDto } from './dto/interview.dto.js';
import { Interview, InterviewAnswer, InterviewStatus } from './interview.entity.js';

@Injectable()
export class InterviewsService implements OnModuleInit {
  private readonly logger = new Logger(InterviewsService.name);
  private readonly audioDir: string;

  constructor(
    @InjectRepository(Interview) private readonly interviews: Repository<Interview>,
    @InjectRepository(InterviewAnswer) private readonly answers: Repository<InterviewAnswer>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly config: ConfigService,
  ) {
    this.audioDir = resolve(config.get('INTERVIEW_AUDIO_DIR', 'storage/entrevistas'));
  }

  async onModuleInit() {
    await mkdir(this.audioDir, { recursive: true });
  }

  async start(userId: string, jobId: string): Promise<Interview> {
    if (!(await this.jobs.existsBy({ id: jobId, userId }))) throw new NotFoundException('Vaga não encontrada.');
    const interview = await this.interviews.save(this.interviews.create({ userId, jobId }));
    interview.answers = [];
    return interview;
  }

  async findOne(userId: string, id: string): Promise<Interview> {
    const interview = await this.interviews.findOne({ where: { id, userId }, relations: { answers: true } });
    if (!interview) throw new NotFoundException('Entrevista não encontrada.');
    return interview;
  }

  /** Grava o áudio em <userId>/<interviewId>/<NN>.<ext>; regravar a mesma pergunta substitui o arquivo. */
  async saveAnswer(
    userId: string,
    id: string,
    dto: SaveAnswerDto,
    file: Express.Multer.File | undefined,
  ): Promise<InterviewAnswer> {
    if (!file) throw new BadRequestException('Envie o áudio no campo "file".');
    const audio = inspectAudio(file.buffer);
    if (typeof audio === 'string') throw new BadRequestException(audio);

    const interview = await this.findOne(userId, id);
    if (interview.status !== InterviewStatus.InProgress) {
      throw new ConflictException('A entrevista já foi finalizada.');
    }

    const storageKey = `${userId}/${id}/${String(dto.questionIndex).padStart(2, '0')}${audio.extension}`;
    const path = join(this.audioDir, storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);

    const previous = interview.answers?.find((a) => a.questionIndex === dto.questionIndex);
    if (previous && previous.storageKey !== storageKey) await this.deleteFile(previous.storageKey);

    await this.answers.upsert(
      {
        interviewId: id,
        questionIndex: dto.questionIndex,
        question: dto.question,
        storageKey,
        mimeType: audio.mimeType,
        sizeBytes: file.size,
        durationMs: dto.durationMs,
      },
      ['interviewId', 'questionIndex'],
    );
    return this.answers.findOneByOrFail({ interviewId: id, questionIndex: dto.questionIndex });
  }

  /**
   * Encerra a entrevista e envia os áudios ao n8n. Pode ser chamado de novo para
   * reenviar enquanto o status não for "sent".
   */
  async finish(userId: string, id: string): Promise<{ interview: Interview; delivery: Delivery }> {
    const interview = await this.findOne(userId, id);
    if (interview.status === InterviewStatus.Sent) return { interview, delivery: 'sent' };
    if (!interview.answers?.length) {
      throw new BadRequestException('Grave pelo menos uma resposta antes de finalizar.');
    }
    if (interview.status === InterviewStatus.InProgress) {
      interview.status = InterviewStatus.Finished;
      interview.finishedAt = new Date();
      await this.interviews.save(interview);
    }

    const delivery = await this.sendToN8n(interview);
    if (delivery === 'sent') {
      interview.status = InterviewStatus.Sent;
      interview.sentAt = new Date();
      await this.interviews.save(interview);
    }
    return { interview, delivery };
  }

  /**
   * Envia multipart/form-data ao webhook do n8n:
   * - campos: interviewId, userId, jobId, finishedAt, job (JSON) e answers (JSON com a pergunta de cada áudio)
   * - arquivos: audio_0, audio_1... (no n8n aparecem em `$binary.audio_0`...)
   * Sem N8N_INTERVIEW_WEBHOOK_URL configurada, nada é enviado (delivery "pending").
   */
  private async sendToN8n(interview: Interview): Promise<Delivery> {
    const url = this.config.get<string>('N8N_INTERVIEW_WEBHOOK_URL');
    if (!url) {
      this.logger.warn(`N8N_INTERVIEW_WEBHOOK_URL não configurada; entrevista ${interview.id} aguardando envio.`);
      return 'pending';
    }

    const job = await this.jobs.findOneBy({ id: interview.jobId });
    const answers = [...(interview.answers ?? [])].sort((a, b) => a.questionIndex - b.questionIndex);
    const form = new FormData();
    form.append('interviewId', interview.id);
    form.append('userId', interview.userId);
    form.append('jobId', interview.jobId);
    form.append('finishedAt', (interview.finishedAt ?? new Date()).toISOString());
    form.append(
      'job',
      JSON.stringify(
        job && {
          company: job.company,
          role: job.role,
          location: job.location,
          workMode: job.workMode,
          tags: job.tags,
          link: job.link,
        },
      ),
    );
    form.append(
      'answers',
      JSON.stringify(
        answers.map((a, i) => ({
          field: `audio_${i}`,
          questionIndex: a.questionIndex,
          question: a.question,
          durationMs: a.durationMs,
          mimeType: a.mimeType,
        })),
      ),
    );

    try {
      for (const [i, a] of answers.entries()) {
        const buffer = await readFile(join(this.audioDir, a.storageKey));
        const name = `pergunta-${String(a.questionIndex + 1).padStart(2, '0')}${a.storageKey.slice(a.storageKey.lastIndexOf('.'))}`;
        form.append(`audio_${i}`, new Blob([new Uint8Array(buffer)], { type: a.mimeType }), name);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(Number(this.config.get('N8N_INTERVIEW_WEBHOOK_TIMEOUT_MS')) || 120_000),
      });
      if (!response.ok) {
        this.logger.error(`Webhook de entrevista respondeu ${response.status}: ${(await response.text()).slice(0, 500)}`);
        return 'failed';
      }
      return 'sent';
    } catch (error) {
      this.logger.error(`Falha ao enviar a entrevista ${interview.id} ao n8n (${url}): ${String(error)}`);
      return 'failed';
    }
  }

  /** Apaga os áudios do usuário (usado ao excluir a conta). */
  async deleteUserFolder(userId: string): Promise<void> {
    await rm(join(this.audioDir, userId), { recursive: true, force: true }).catch((error: unknown) =>
      this.logger.warn(`Não foi possível apagar os áudios do usuário ${userId}: ${String(error)}`),
    );
  }

  private async deleteFile(storageKey: string): Promise<void> {
    await rm(join(this.audioDir, storageKey), { force: true }).catch((error: unknown) =>
      this.logger.warn(`Não foi possível apagar ${storageKey}: ${String(error)}`),
    );
  }
}
