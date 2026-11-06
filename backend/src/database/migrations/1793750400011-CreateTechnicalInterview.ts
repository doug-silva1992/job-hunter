import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabela "technical_interview": entrevista técnica gerada a partir de um relatório de simulação
 * ("interviews"). Segue o formato de "interviews" (colunas em português, gravadas pelo n8n), com
 * 6 perguntas, o áudio de cada resposta e 6 notas de 0 a 10.
 */
export class CreateTechnicalInterview1793750400011 implements MigrationInterface {
  name = 'CreateTechnicalInterview1793750400011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "technical_interview" (
        "id"              uuid        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"         uuid        NOT NULL,
        "interview_id"    uuid,
        "job_id"          uuid,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "candidato_nome"  text,
        "candidato_email" text,
        "cargo"           text,
        "requisitos"      text,
        "descricao"       text,
        "pergunta_1"      text,
        "pergunta_2"      text,
        "pergunta_3"      text,
        "pergunta_4"      text,
        "pergunta_5"      text,
        "pergunta_6"      text,
        "audio_url_1"     text,
        "audio_url_2"     text,
        "audio_url_3"     text,
        "audio_url_4"     text,
        "audio_url_5"     text,
        "audio_url_6"     text,
        "nota_1"          numeric,
        "nota_2"          numeric,
        "nota_3"          numeric,
        "nota_4"          numeric,
        "nota_5"          numeric,
        "nota_6"          numeric,
        "nota_geral"      numeric,
        "resumo"          text,
        "recomendacao"    text,
        "avaliacao_json"  jsonb,
        "status"          text        NOT NULL DEFAULT 'processando',
        CONSTRAINT "PK_technical_interview" PRIMARY KEY ("id"),
        CONSTRAINT "FK_technical_interview_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_technical_interview_interview" FOREIGN KEY ("interview_id")
          REFERENCES "interviews" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_technical_interview_job" FOREIGN KEY ("job_id")
          REFERENCES "jobs" ("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_technical_interview_notas" CHECK (
          ("nota_1" IS NULL OR "nota_1" BETWEEN 0 AND 10) AND
          ("nota_2" IS NULL OR "nota_2" BETWEEN 0 AND 10) AND
          ("nota_3" IS NULL OR "nota_3" BETWEEN 0 AND 10) AND
          ("nota_4" IS NULL OR "nota_4" BETWEEN 0 AND 10) AND
          ("nota_5" IS NULL OR "nota_5" BETWEEN 0 AND 10) AND
          ("nota_6" IS NULL OR "nota_6" BETWEEN 0 AND 10) AND
          ("nota_geral" IS NULL OR "nota_geral" BETWEEN 0 AND 10)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_technical_interview_user_created" ON "technical_interview" ("user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_technical_interview_interview" ON "technical_interview" ("interview_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "technical_interview"`);
  }
}
