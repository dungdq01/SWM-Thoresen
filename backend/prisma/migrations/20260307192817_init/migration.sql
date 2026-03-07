-- AlterTable
ALTER TABLE "app_user" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "business_rule_catalog" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "change_control_record" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "decision_log" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "idempotency_record" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "number_sequence" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "number_sequence_counter" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permission" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reason_code" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "role" ALTER COLUMN "updated_at" DROP DEFAULT;
