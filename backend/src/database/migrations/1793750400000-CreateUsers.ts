import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1793750400000 implements MigrationInterface {
  name = 'CreateUsers1793750400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid         NOT NULL DEFAULT gen_random_uuid(),
        "username"      varchar(30)  NOT NULL,
        "email"         varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_at"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_users_email_lowercase" CHECK ("email" = lower("email")),
        CONSTRAINT "CHK_users_username_format" CHECK ("username" ~ '^[a-zA-Z0-9._-]{3,30}$')
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`);
    // "DougDev" e "dougdev" são considerados o mesmo nome de usuário
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username_lower" ON "users" (lower("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
