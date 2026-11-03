import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobs1793750400002 implements MigrationInterface {
  name = 'CreateJobs1793750400002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "job_work_mode" AS ENUM ('remote', 'hybrid', 'onsite')`,
    );
    await queryRunner.query(
      `CREATE TYPE "job_stage" AS ENUM ('found', 'applied', 'interview', 'offer')`,
    );
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     uuid          NOT NULL,
        "company"     varchar(120)  NOT NULL,
        "role"        varchar(160)  NOT NULL,
        "location"    varchar(120)  NOT NULL,
        "work_mode"   job_work_mode NOT NULL,
        "match_score" smallint      NOT NULL,
        "tags"        text[]        NOT NULL DEFAULT '{}',
        "stage"       job_stage     NOT NULL DEFAULT 'found',
        "posted_at"   timestamptz,
        "created_at"  timestamptz   NOT NULL DEFAULT now(),
        "updated_at"  timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_jobs_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_jobs_match_score" CHECK ("match_score" BETWEEN 0 AND 100)
      )
    `);
    // colunas do kanban e da lista "Vagas recomendadas" (ordenada por aderência)
    await queryRunner.query(`CREATE INDEX "IDX_jobs_user_stage" ON "jobs" ("user_id", "stage")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_user_match" ON "jobs" ("user_id", "match_score" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "job_stage"`);
    await queryRunner.query(`DROP TYPE "job_work_mode"`);
  }
}
