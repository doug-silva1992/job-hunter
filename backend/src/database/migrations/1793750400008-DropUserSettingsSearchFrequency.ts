import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Remove a preferência "Busca automática" (frequência da busca), que saiu da tela de Configurações. */
export class DropUserSettingsSearchFrequency1793750400008 implements MigrationInterface {
  name = 'DropUserSettingsSearchFrequency1793750400008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "search_frequency"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "search_frequency"`);
  }

  /** Recria a coluna com o padrão antigo; os valores que existiam não voltam. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "search_frequency" AS ENUM ('manual', 'daily', 'twice_daily', 'weekly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD COLUMN "search_frequency" search_frequency NOT NULL DEFAULT 'daily'`,
    );
  }
}
