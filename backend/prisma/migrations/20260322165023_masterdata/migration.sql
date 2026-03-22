-- CreateEnum
CREATE TYPE "IncompatibilityRuleType" AS ENUM ('ITEM_TO_ITEM', 'ITEM_TO_GROUP', 'GROUP_TO_GROUP');

-- AlterTable
ALTER TABLE "md_owner" ADD COLUMN     "dual_tracking_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "md_item_incompatibility" (
    "id" UUID NOT NULL,
    "rule_type" "IncompatibilityRuleType" NOT NULL,
    "item_id" UUID,
    "item_group_id" UUID,
    "incompatible_with_item_id" UUID,
    "incompatible_with_group_id" UUID,
    "reason" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_item_incompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_owner_warehouse_access" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_owner_warehouse_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "md_item_incompatibility_item_id_is_active_idx" ON "md_item_incompatibility"("item_id", "is_active");

-- CreateIndex
CREATE INDEX "md_item_incompatibility_item_group_id_is_active_idx" ON "md_item_incompatibility"("item_group_id", "is_active");

-- CreateIndex
CREATE INDEX "md_item_incompatibility_incompatible_with_item_id_is_active_idx" ON "md_item_incompatibility"("incompatible_with_item_id", "is_active");

-- CreateIndex
CREATE INDEX "md_item_incompatibility_incompatible_with_group_id_is_activ_idx" ON "md_item_incompatibility"("incompatible_with_group_id", "is_active");

-- CreateIndex
CREATE INDEX "md_owner_warehouse_access_warehouse_id_is_active_idx" ON "md_owner_warehouse_access"("warehouse_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_owner_warehouse_access_owner_id_warehouse_id_key" ON "md_owner_warehouse_access"("owner_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "md_item_incompatibility" ADD CONSTRAINT "md_item_incompatibility_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_incompatibility" ADD CONSTRAINT "md_item_incompatibility_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "md_item_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_incompatibility" ADD CONSTRAINT "md_item_incompatibility_incompatible_with_item_id_fkey" FOREIGN KEY ("incompatible_with_item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_incompatibility" ADD CONSTRAINT "md_item_incompatibility_incompatible_with_group_id_fkey" FOREIGN KEY ("incompatible_with_group_id") REFERENCES "md_item_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_warehouse_access" ADD CONSTRAINT "md_owner_warehouse_access_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_warehouse_access" ADD CONSTRAINT "md_owner_warehouse_access_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
