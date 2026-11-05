import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Simulações de entrevista e os áudios de cada resposta (arquivos em INTERVIEW_AUDIO_DIR). */
export class CreateInterviews1793750400006 implements MigrationInterface {
  name = 'CreateInterviews1793750400006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "interview_status" AS ENUM ('in_progress', 'finished', 'sent')`);
    await queryRunner.query(`
      CREATE TABLE "interviews" (
        "id"          uuid             NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     uuid             NOT NULL,
        "job_id"      uuid             NOT NULL,
        "status"      interview_status NOT NULL DEFAULT 'in_progress',
        "finished_at" timestamptz,
        "sent_at"     timestamptz,
        "created_at"  timestamptz      NOT NULL DEFAULT now(),
        "updated_at"  timestamptz      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interviews_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interviews_job" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_interviews_user_created" ON "interviews" ("user_id", "created_at")`);
    await queryRunner.query(`
      CREATE TABLE "interview_answers" (
        "id"             uuid         NOT NULL DEFAULT gen_random_uuid(),
        "interview_id"   uuid         NOT NULL,
        "question_index" smallint     NOT NULL,
        "question"       text         NOT NULL,
        "storage_key"    varchar(255) NOT NULL,
        "mime_type"      varchar(100) NOT NULL,
        "size_bytes"     integer      NOT NULL,
        "duration_ms"    integer      NOT NULL,
        "created_at"     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interview_answers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_interview_answers_question" UNIQUE ("interview_id", "question_index"),
        CONSTRAINT "FK_interview_answers_interview" FOREIGN KEY ("interview_id")
          REFERENCES "interviews" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "interview_answers"`);
    await queryRunner.query(`DROP TABLE "interviews"`);
    await queryRunner.query(`DROP TYPE "interview_status"`);
  }
}
