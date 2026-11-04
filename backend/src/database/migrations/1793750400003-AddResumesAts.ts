import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Coluna com o resultado da análise de ATS (JSON em texto), gravada pelo n8n. */
export class AddResumesAts1793750400003 implements MigrationInterface {
  name = 'AddResumesAts1793750400003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS: a coluna já foi criada manualmente no banco de desenvolvimento
    await queryRunner.query(`ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "ats" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "resumes" DROP COLUMN IF EXISTS "ats"`);
  }
}
