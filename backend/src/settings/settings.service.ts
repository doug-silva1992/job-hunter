import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkMode } from '../jobs/job.entity.js';
import type { SettingsDto } from './dto/settings.dto.js';
import { SearchFrequency, UserSettings } from './user-settings.entity.js';

export const DEFAULT_SETTINGS: SettingsDto = {
  minMatch: 70,
  keywords: [],
  excludedKeywords: [],
  seniority: [],
  workModes: [WorkMode.Remote, WorkMode.Hybrid, WorkMode.Onsite],
  locations: [],
  minSalary: null,
  maxJobAgeDays: 30,
  searchFrequency: SearchFrequency.Daily,
  notifyNewJobs: true,
  weeklySummary: false,
};

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(UserSettings) private readonly repo: Repository<UserSettings>) {}

  /** A linha só é criada no primeiro PUT; até lá valem os padrões. */
  async get(userId: string): Promise<{ settings: UserSettings; saved: boolean }> {
    const found = await this.repo.findOneBy({ userId });
    if (found) return { settings: found, saved: true };
    return { settings: this.repo.create({ ...DEFAULT_SETTINGS, userId }), saved: false };
  }

  async save(userId: string, dto: SettingsDto): Promise<UserSettings> {
    await this.repo.upsert({ ...dto, userId }, ['userId']);
    return this.repo.findOneByOrFail({ userId });
  }
}
