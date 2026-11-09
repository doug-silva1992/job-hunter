import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vagas cadastradas manualmente: descrição da vaga, currículo comparado e o resultado da
 * análise de ATS (vaga x currículo) devolvido pelo n8n.
 */
export class AddJobsManualAts1793750400012 implements MigrationInterface {
  name = 'AddJobsManualAts1793750400012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "resume_id" uuid,
        ADD COLUMN IF NOT EXISTS "ats" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs" ADD CONSTRAINT "FK_jobs_resume" FOREIGN KEY ("resume_id")
        REFERENCES "resumes" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "FK_jobs_resume"`);
    await queryRunner.query(`
      ALTER TABLE "jobs"
        DROP COLUMN IF EXISTS "ats",
        DROP COLUMN IF EXISTS "resume_id",
        DROP COLUMN IF EXISTS "description"
    `);
  }
}
