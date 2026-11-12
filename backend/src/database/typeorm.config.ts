import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';
import { InterviewReport } from '../interviews/interview-report.entity.js';
import { Job } from '../jobs/job.entity.js';
import { Preparation } from '../preparation/preparation.entity.js';
import { Resume } from '../resumes/resume.entity.js';
import { UserSettings } from '../settings/user-settings.entity.js';
import { User } from '../users/user.entity.js';

const here = dirname(fileURLToPath(import.meta.url));

export function dataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'jobhunter',
    password: env.DB_PASSWORD ?? 'jobhunter',
    database: env.DB_NAME ?? 'jobhunter',
    entities: [User, Resume, Job, UserSettings, InterviewReport, Preparation],
    // glob com barras normais para funcionar também no Windows
    migrations: [join(here, 'migrations', '*.js').replace(/\\/g, '/')],
    migrationsTableName: 'migrations',
    // o schema muda SOMENTE via migrations, executadas manualmente
    synchronize: false,
    migrationsRun: false,
  };
}
