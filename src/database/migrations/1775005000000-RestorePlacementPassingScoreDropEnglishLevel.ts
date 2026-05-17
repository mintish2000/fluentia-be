import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestorePlacementPassingScoreDropEnglishLevel1775005000000 implements MigrationInterface {
  name = 'RestorePlacementPassingScoreDropEnglishLevel1775005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "placement" DROP COLUMN IF EXISTS "englishLevel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "placement" ADD COLUMN IF NOT EXISTS "passingScore" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "placement" DROP COLUMN IF EXISTS "passingScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "placement" ADD COLUMN IF NOT EXISTS "englishLevel" character varying`,
    );
  }
}
