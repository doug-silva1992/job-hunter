import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateJobDto, JobStatsDto, ListJobsQueryDto, UpdateJobDto } from './dto/job.dto.js';
import { Job, JobStage } from './job.entity.js';

@Injectable()
export class JobsService {
  constructor(@InjectRepository(Job) private readonly repo: Repository<Job>) {}

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
        postedAt: dto.postedAt ?? null,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(userId, id);
    Object.assign(job, dto);
    return this.repo.save(job);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Vaga não encontrada.');
  }
}
