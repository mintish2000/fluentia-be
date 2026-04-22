import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyElearningTables1775006000000
  implements MigrationInterface
{
  name = 'DropLegacyElearningTables1775006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "review" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quiz" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollment" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "file" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally not restoring dropped legacy schema.
    // Re-create from historical migrations if rollback is required.
    await queryRunner.query(`SELECT 1`);
  }
}
