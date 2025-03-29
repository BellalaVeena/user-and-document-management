import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709123456789 implements MigrationInterface {
  name = 'InitialSchema1709123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user" (
                "id" SERIAL NOT NULL,
                "username" character varying NOT NULL,
                "password" character varying NOT NULL,
                "role" character varying NOT NULL DEFAULT 'viewer',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "document" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "filename" character varying NOT NULL,
                "filePath" character varying NOT NULL,
                "content" text,
                "status" character varying NOT NULL DEFAULT 'pending',
                "metadata" jsonb,
                "uploadedById" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7424d1c20cdbf923dd5d44a05e4" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "ingestion" (
                "id" SERIAL NOT NULL,
                "documentId" integer NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "result" jsonb,
                "error" character varying,
                "triggeredById" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8c1c0c0c0c0c0c0c0c0c0c0c0c0c" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "document" ADD CONSTRAINT "FK_7424d1c20cdbf923dd5d44a05e4" 
            FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ingestion" ADD CONSTRAINT "FK_8c1c0c0c0c0c0c0c0c0c0c0c0c0c" 
            FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ingestion" ADD CONSTRAINT "FK_9c1c0c0c0c0c0c0c0c0c0c0c0c0c" 
            FOREIGN KEY ("triggeredById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ingestion" DROP CONSTRAINT "FK_9c1c0c0c0c0c0c0c0c0c0c0c0c0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingestion" DROP CONSTRAINT "FK_8c1c0c0c0c0c0c0c0c0c0c0c0c0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_7424d1c20cdbf923dd5d44a05e4"`,
    );
    await queryRunner.query(`DROP TABLE "ingestion"`);
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
