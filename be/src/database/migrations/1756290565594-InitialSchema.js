/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitialSchema1756290565594 {
    name = 'InitialSchema1756290565594'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "PK_8bf09ba754322ab9c22a215c919"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "employeeCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "PK_ea486e99ef9c58340aa17bf9c5f" PRIMARY KEY ("employeeCode")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "fullName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "department" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "branch" character varying NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "department"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fullName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "PK_ea486e99ef9c58340aa17bf9c5f"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "employeeCode"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('USER', 'UPLOADER', 'REVIEWER', 'ADMIN')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId")`);
    }
}
