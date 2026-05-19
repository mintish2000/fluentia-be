import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds B-tree indexes on the foreign-key columns most frequently used in WHERE clauses:
 *   - student_answer.studentId   (batch placement queries per student)
 *   - student_answer.placementId (score aggregation, per-placement scans)
 *   - payment.studentId          (per-student payment lookups)
 *
 * These columns are the join side of ManyToOne relations; PostgreSQL does not
 * create indexes on them automatically (only on the primary-key / unique side).
 */
export class AddForeignKeyIndexes1775009000000 implements MigrationInterface {
  name = 'AddForeignKeyIndexes1775009000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_student_answer_studentId" ON "student_answer" ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_student_answer_placementId" ON "student_answer" ("placementId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_studentId" ON "payment" ("studentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_studentId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_student_answer_placementId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_student_answer_studentId"`,
    );
  }
}
