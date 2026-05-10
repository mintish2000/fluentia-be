import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `shift` enum column to the `user` table with a default of 'morning'.
 * Values: 'morning' | 'evening'.
 */
export class AddUserShiftColumn1775008000000 implements MigrationInterface {
  name = 'AddUserShiftColumn1775008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_shift_enum" AS ENUM('morning', 'evening')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "shift" "public"."user_shift_enum" DEFAULT 'morning'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "shift"`);
    await queryRunner.query(`DROP TYPE "public"."user_shift_enum"`);
  }
}
