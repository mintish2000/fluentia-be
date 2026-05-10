import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreFileEntityTable1775007000000 implements MigrationInterface {
  name = 'RestoreFileEntityTable1775007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "path" character varying NOT NULL, CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "photoId" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'REL_75e2be4ce11d447ef43be0e374'
        ) THEN
          ALTER TABLE "user"
          ADD CONSTRAINT "REL_75e2be4ce11d447ef43be0e374" UNIQUE ("photoId");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_75e2be4ce11d447ef43be0e374f'
        ) THEN
          ALTER TABLE "user"
          ADD CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f"
          FOREIGN KEY ("photoId") REFERENCES "file"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_75e2be4ce11d447ef43be0e374f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "REL_75e2be4ce11d447ef43be0e374"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "file"`);
  }
}
