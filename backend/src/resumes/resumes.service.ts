import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import {
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
import { isUniqueViolation } from '../common/validation.js';
import { inspectResumeFile } from './resume-file.js';
import { Resume } from './resume.entity.js';

@Injectable()
export class ResumesService implements OnModuleInit {
  private readonly logger = new Logger(ResumesService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Resume) private readonly repo: Repository<Resume>,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get('UPLOAD_DIR', 'uploads'));
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

  async upload(userId: string, file: Express.Multer.File | undefined): Promise<Resume> {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');
    const inspected = inspectResumeFile(file.originalname, file.buffer);
    if (typeof inspected === 'string') throw new BadRequestException(inspected);

    const storageKey = `${randomUUID()}${inspected.extension}`;
    await writeFile(join(this.uploadDir, storageKey), file.buffer);

    const data = {
      userId,
      storageKey,
      originalName: inspected.originalName,
      mimeType: inspected.mimeType,
      sizeBytes: file.buffer.length,
    };

    try {
      // o primeiro currículo do usuário vira o principal
      const hasPrimary = await this.repo.existsBy({ userId, isPrimary: true });
      try {
        return await this.repo.save(this.repo.create({ ...data, isPrimary: !hasPrimary }));
      } catch (error) {
        // dois uploads simultâneos tentaram ser o principal: este entra como secundário
        if (!isUniqueViolation(error, 'UQ_resumes_one_primary_per_user')) throw error;
        return await this.repo.save(this.repo.create({ ...data, isPrimary: false }));
      }
    } catch (error) {
      await this.deleteFiles([storageKey]);
      throw error;
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

  async storageKeysOf(userId: string): Promise<string[]> {
    const rows = await this.repo.find({ where: { userId }, select: { storageKey: true } });
    return rows.map((r) => r.storageKey);
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
