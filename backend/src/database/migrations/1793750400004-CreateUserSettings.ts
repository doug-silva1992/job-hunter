import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Preferências de busca de vagas e de notificação (uma linha por usuário). */
export class CreateUserSettings1793750400004 implements MigrationInterface {
  name = 'CreateUserSettings1793750400004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "search_frequency" AS ENUM ('manual', 'daily', 'twice_daily', 'weekly')`,
    );
    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "user_id"           uuid              NOT NULL,
        "min_match"         smallint          NOT NULL DEFAULT 70,
        "keywords"          text[]            NOT NULL DEFAULT '{}',
        "excluded_keywords" text[]            NOT NULL DEFAULT '{}',
        "seniority"         text[]            NOT NULL DEFAULT '{}',
        "work_modes"        job_work_mode[]   NOT NULL DEFAULT '{remote,hybrid,onsite}',
        "locations"         text[]            NOT NULL DEFAULT '{}',
        "min_salary"        integer,
        "max_job_age_days"  smallint          NOT NULL DEFAULT 30,
        "search_frequency"  search_frequency  NOT NULL DEFAULT 'daily',
        "notify_new_jobs"   boolean           NOT NULL DEFAULT true,
        "weekly_summary"    boolean           NOT NULL DEFAULT false,
        "updated_at"        timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_settings" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_user_settings_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_user_settings_min_match" CHECK ("min_match" BETWEEN 0 AND 100),
        CONSTRAINT "CHK_user_settings_job_age" CHECK ("max_job_age_days" BETWEEN 1 AND 90),
        CONSTRAINT "CHK_user_settings_salary" CHECK ("min_salary" IS NULL OR "min_salary" >= 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(`DROP TYPE "search_frequency"`);
  }
}
