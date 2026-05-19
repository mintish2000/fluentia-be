import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable `planKey` column to the `payment` table.
 * Stores the PLAN_CATALOGUE key (e.g. 'private-30-1') for each payment.
 */
export class AddPaymentPlanKey1775010000000 implements MigrationInterface {
  name = 'AddPaymentPlanKey1775010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "planKey" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "planKey"`);
  }
}
