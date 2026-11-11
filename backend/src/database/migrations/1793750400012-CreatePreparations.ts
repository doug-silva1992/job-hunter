import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabela "preparations": o preparatório gerado para uma vaga (tela Preparatório).
 * - questions: perguntas do questionário geradas pelo n8n (text, JSON serializado)
 * - company:   dados da empresa para a preparação (text, JSON serializado)
 * - score:     nota do questionário, de 0 a 10 (null até ser respondido)
 * Apagar o usuário ou a vaga apaga o preparatório.
 */
export class CreatePreparations1793750400012 implements MigrationInterface {
  name = 'CreatePreparations1793750400012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "preparations" (
        "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    uuid        NOT NULL,
        "job_id"     uuid        NOT NULL,
        "questions"  text        NOT NULL,
        "company"    text        NOT NULL,
        "score"      numeric(4,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_preparations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_preparations_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_preparations_job" FOREIGN KEY ("job_id")
          REFERENCES "jobs" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_preparations_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 10)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_preparations_user_job_created" ON "preparations" ("user_id", "job_id", "created_at" DESC)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_preparations_job" ON "preparations" ("job_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "preparations"`);
  }
}
