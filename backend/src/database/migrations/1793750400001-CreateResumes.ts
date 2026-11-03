import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumes1793750400001 implements MigrationInterface {
  name = 'CreateResumes1793750400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "resumes" (
        "id"            uuid         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"       uuid         NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "mime_type"     varchar(100) NOT NULL,
        "size_bytes"    integer      NOT NULL,
        "storage_key"   varchar(255) NOT NULL,
        "is_primary"    boolean      NOT NULL DEFAULT false,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resumes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resumes_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_resumes_size" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_resumes_storage_key" ON "resumes" ("storage_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resumes_user_created" ON "resumes" ("user_id", "created_at" DESC)`,
    );
    // no máximo um currículo principal por usuário
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_resumes_one_primary_per_user" ON "resumes" ("user_id") WHERE "is_primary"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "resumes"`);
  }
}
