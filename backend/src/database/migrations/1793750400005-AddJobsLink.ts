import type { MigrationInterface, QueryRunner } from 'typeorm';

/** URL da página da vaga (gravada pelo n8n). IF NOT EXISTS: a coluna já foi criada à mão em alguns bancos. */
export class AddJobsLink1793750400005 implements MigrationInterface {
  name = 'AddJobsLink1793750400005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "link" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "link"`);
  }
}
