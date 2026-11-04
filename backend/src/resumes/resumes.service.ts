import { createReadStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
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
import type { ReadStream } from 'node:fs';
import { DataSource, Repository } from 'typeorm';
import type { User } from '../users/user.entity.js';
import { inspectResumeFile } from './resume-file.js';
import { Resume } from './resume.entity.js';

export const DEFAULT_ATS_WEBHOOK_URL = 'http://localhost:5678/webhook-test/ats-check';


@Injectable()
export class ResumesService implements OnModuleInit {
  private readonly logger = new Logger(ResumesService.name);
  private readonly uploadDir: string;
  private readonly atsWebhookUrl: string;
  private readonly atsWebhookTimeoutMs: number;

  constructor(
    @InjectRepository(Resume) private readonly repo: Repository<Resume>,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get('UPLOAD_DIR', 'storage/curriculos'));
    this.atsWebhookUrl = config.get('N8N_ATS_WEBHOOK_URL') || DEFAULT_ATS_WEBHOOK_URL;
    this.atsWebhookTimeoutMs = Number(config.get('N8N_ATS_WEBHOOK_TIMEOUT_MS')) || 60_000;
  }

  async onModuleInit() {
    await mkdir(this.uploadDir, { recursive: true });
  }

  list(userId: string): Promise<Resume[]> {
    return this.repo.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Resume> {
    const resume = await this.repo.findOneBy({ id, userId });
    if (!resume) throw new NotFoundException('Currículo não encontrado.');
    return resume;
  }

  /**
   * Valida o arquivo e o encaminha, como multipart/form-data (arquivo
   * binário no campo "data"), para o webhook de ATS do n8n. Nada é gravado
   * em disco nem no banco: quem processa e persiste é o fluxo do n8n. Retorna a resposta do webhook.
   */
  async upload(user: User, file: Express.Multer.File | undefined): Promise<unknown> {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');
    const inspected = inspectResumeFile(file.originalname, file.buffer);
    if (typeof inspected === 'string') throw new BadRequestException(inspected);

    // No n8n o arquivo aparece em `$binary.data` (File Name, Extension,
    // Mime Type, Size); o userId chega em `body`.
    const form = new FormData();
    form.append('data', new Blob([new Uint8Array(file.buffer)], { type: inspected.mimeType }), inspected.originalName);
    form.append('userId', user.id);

    let response: Response;
    try {
      response = await fetch(this.atsWebhookUrl, {
        method: 'POST',
        // o Content-Type (com o boundary do multipart) é definido pelo fetch
        headers: { Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(this.atsWebhookTimeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao contatar o webhook de ATS (${this.atsWebhookUrl}): ${String(error)}`);
      throw new BadGatewayException('Não foi possível enviar o currículo para análise. Tente novamente.');
    }

    const body = await response.text();
    if (!response.ok) {
      this.logger.error(`Webhook de ATS respondeu ${response.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException('O serviço de análise de currículos retornou um erro.');
    }
    if (!body) return { received: true };
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return { message: body };
    }
  }

  async openFile(userId: string, id: string): Promise<{ resume: Resume; stream: ReadStream }> {
    const resume = await this.findOne(userId, id);
    return { resume, stream: createReadStream(join(this.uploadDir, resume.storageKey)) };
  }

  async setPrimary(userId: string, id: string): Promise<Resume> {
    await this.findOne(userId, id);
    await this.dataSource.transaction(async (tx) => {
      // desmarca antes de marcar, por causa do índice único parcial
      await tx.update(Resume, { userId, isPrimary: true }, { isPrimary: false });
      await tx.update(Resume, { id, userId }, { isPrimary: true });
    });
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const resume = await this.findOne(userId, id);
    await this.dataSource.transaction(async (tx) => {
      await tx.delete(Resume, { id, userId });
      if (resume.isPrimary) {
        // promove o currículo mais recente a principal
        await tx.query(
          `UPDATE "resumes" SET "is_primary" = true
           WHERE "id" = (SELECT "id" FROM "resumes" WHERE "user_id" = $1 ORDER BY "created_at" DESC LIMIT 1)`,
          [userId],
        );
      }
    });
    await this.deleteFiles([resume.storageKey]);
  }

  /** Apaga a pasta de currículos do usuário (usado ao excluir a conta). */
  async deleteUserFolder(userId: string): Promise<void> {
    await rm(join(this.uploadDir, userId), { recursive: true, force: true }).catch((error: unknown) =>
      this.logger.warn(`Não foi possível apagar a pasta do usuário ${userId}: ${String(error)}`),
    );
  }

  async deleteFiles(storageKeys: string[]): Promise<void> {
    await Promise.all(
      storageKeys.map((key) =>
        rm(join(this.uploadDir, key), { force: true }).catch((error: unknown) =>
          this.logger.warn(`Não foi possível apagar ${key}: ${String(error)}`),
        ),
      ),
    );
  }
}
