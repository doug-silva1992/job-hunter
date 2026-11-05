import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Nova coluna "Rejeitados" no Pipeline de candidaturas. */
export class AddJobStageRejected1793750400007 implements MigrationInterface {
  name = 'AddJobStageRejected1793750400007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "job_stage" ADD VALUE IF NOT EXISTS 'rejected'`);
  }

  /** O Postgres não remove valores de enum: recria o tipo. Vagas rejeitadas voltam para "applied". */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "jobs" SET "stage" = 'applied' WHERE "stage" = 'rejected'`);
    await queryRunner.query(`ALTER TABLE "jobs" ALTER COLUMN "stage" DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE "job_stage" RENAME TO "job_stage_old"`);
    await queryRunner.query(`CREATE TYPE "job_stage" AS ENUM ('found', 'applied', 'interview', 'offer')`);
    await queryRunner.query(
      `ALTER TABLE "jobs" ALTER COLUMN "stage" TYPE "job_stage" USING "stage"::text::"job_stage"`,
    );
    await queryRunner.query(`ALTER TABLE "jobs" ALTER COLUMN "stage" SET DEFAULT 'found'`);
    await queryRunner.query(`DROP TYPE "job_stage_old"`);
  }
}
