import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabela "interviews" com os relatórios das simulações de entrevista. Quem grava as linhas é o
 * fluxo "Interview Training" do n8n (avaliação do Gemini); o backend só lê e liga a linha à vaga.
 * Usa IF NOT EXISTS porque a tabela pode já ter sido criada à mão para o n8n.
 * As FKs são NOT VALID para não falhar com linhas antigas; valem para as linhas novas.
 */
export class CreateInterviewReports1793750400010 implements MigrationInterface {
  name = 'CreateInterviewReports1793750400010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "interviews" (
        "id"              uuid        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"         uuid        NOT NULL,
        "created_at"      timestamptz DEFAULT now(),
        "candidato_nome"  text,
        "candidato_email" text,
        "cargo"           text,
        "requisitos"      text,
        "audio_url_1"     text,
        "audio_url_2"     text,
        "audio_url_3"     text,
        "audio_url_4"     text,
        "nota_1"          numeric,
        "nota_2"          numeric,
        "nota_3"          numeric,
        "nota_4"          numeric,
        "nota_geral"      numeric,
        "resumo"          text,
        "recomendacao"    text,
        "avaliacao_json"  jsonb,
        "status"          text        DEFAULT 'processando',
        CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "interviews" ADD COLUMN IF NOT EXISTS "job_id" uuid`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_interviews_user') THEN
          ALTER TABLE "interviews" ADD CONSTRAINT "FK_interviews_user"
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_interviews_job') THEN
          ALTER TABLE "interviews" ADD CONSTRAINT "FK_interviews_job"
            FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE SET NULL NOT VALID;
        END IF;
      END $$
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interviews_user_created" ON "interviews" ("user_id", "created_at" DESC)`,
    );
  }

  /** Desfaz só o que o backend acrescentou; a tabela continua sendo usada pelo n8n. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_interviews_user_created"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "FK_interviews_job"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "FK_interviews_user"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP COLUMN IF EXISTS "job_id"`);
  }
}
