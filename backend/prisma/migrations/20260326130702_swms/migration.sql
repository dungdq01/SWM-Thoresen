/*
  Warnings:

  - The values [DRAFT,WEIGHED_IN,PROCESSING,WEIGHED_OUT,RECEIVED,PUTAWAY] on the enum `ReceiptStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ALLOCATED,PICKING,PICKED,WEIGHED_FAIL] on the enum `ShipmentLineStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ALLOCATED,PICKING,PICKED,WEIGHING_TARE,ALL_WEIGHED,PENDING_APPROVAL,WEIGHING_1,WEIGHING_2,WEIGHED] on the enum `ShipmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `all_lines_passed` on the `shipment_header` table. All the data in the column will be lost.
  - You are about to drop the column `pending_approval_count` on the `shipment_header` table. All the data in the column will be lost.
  - You are about to drop the column `tare_weight_kg` on the `shipment_header` table. All the data in the column will be lost.
  - You are about to drop the column `total_gross_kg` on the `shipment_header` table. All the data in the column will be lost.
  - You are about to drop the column `total_net_kg` on the `shipment_header` table. All the data in the column will be lost.
  - You are about to drop the `shipment_allocation_record` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shipment_approval_decision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shipment_weighing_attempt` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReceiptLineStatus" ADD VALUE 'UNLOADED';
ALTER TYPE "ReceiptLineStatus" ADD VALUE 'WEIGHED';

-- AlterEnum
BEGIN;
CREATE TYPE "ReceiptStatus_new" AS ENUM ('NEW', 'CONFIRMED', 'AWAITING_WEIGHING', 'WEIGHING_1', 'UNLOADING', 'UNLOADED', 'WEIGHING_2', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED', 'ERROR');
ALTER TABLE "receipt_header" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "receipt_header" ALTER COLUMN "status" TYPE "ReceiptStatus_new" USING ("status"::text::"ReceiptStatus_new");
ALTER TYPE "ReceiptStatus" RENAME TO "ReceiptStatus_old";
ALTER TYPE "ReceiptStatus_new" RENAME TO "ReceiptStatus";
DROP TYPE "ReceiptStatus_old";
ALTER TABLE "receipt_header" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentLineStatus_new" AS ENUM ('PENDING', 'LOADING', 'WEIGHED_PASS', 'LINE_SHIPPED', 'CANCELLED');
ALTER TABLE "shipment_line" ALTER COLUMN "line_status" DROP DEFAULT;
ALTER TABLE "shipment_line" ALTER COLUMN "line_status" TYPE "ShipmentLineStatus_new" USING ("line_status"::text::"ShipmentLineStatus_new");
ALTER TYPE "ShipmentLineStatus" RENAME TO "ShipmentLineStatus_old";
ALTER TYPE "ShipmentLineStatus_new" RENAME TO "ShipmentLineStatus";
DROP TYPE "ShipmentLineStatus_old";
ALTER TABLE "shipment_line" ALTER COLUMN "line_status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentStatus_new" AS ENUM ('DRAFT', 'CONFIRMED', 'LOADING', 'LOADED', 'SHIPPED', 'CLOSED', 'CANCELLED');
ALTER TABLE "shipment_header" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "shipment_header" ALTER COLUMN "status" TYPE "ShipmentStatus_new" USING ("status"::text::"ShipmentStatus_new");
ALTER TYPE "ShipmentStatus" RENAME TO "ShipmentStatus_old";
ALTER TYPE "ShipmentStatus_new" RENAME TO "ShipmentStatus";
DROP TYPE "ShipmentStatus_old";
ALTER TABLE "shipment_header" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_invent_dim_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_item_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_location_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_shipment_header_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_allocation_record" DROP CONSTRAINT "shipment_allocation_record_shipment_line_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_approval_decision" DROP CONSTRAINT "shipment_approval_decision_shipment_header_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_approval_decision" DROP CONSTRAINT "shipment_approval_decision_shipment_line_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_weighing_attempt" DROP CONSTRAINT "shipment_weighing_attempt_shipment_header_id_fkey";

-- DropForeignKey
ALTER TABLE "shipment_weighing_attempt" DROP CONSTRAINT "shipment_weighing_attempt_shipment_line_id_fkey";

-- AlterTable
ALTER TABLE "md_warehouse" ADD COLUMN     "owner_id" UUID;

-- AlterTable
ALTER TABLE "receipt_header" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "receipt_line" ADD COLUMN     "location_id" UUID,
ADD COLUMN     "unload_sequence_no" INTEGER;

-- AlterTable
ALTER TABLE "shipment_header" DROP COLUMN "all_lines_passed",
DROP COLUMN "pending_approval_count",
DROP COLUMN "tare_weight_kg",
DROP COLUMN "total_gross_kg",
DROP COLUMN "total_net_kg";

-- AlterTable
ALTER TABLE "shipment_line" ADD COLUMN     "location_id" UUID;

-- DropTable
DROP TABLE "shipment_allocation_record";

-- DropTable
DROP TABLE "shipment_approval_decision";

-- DropTable
DROP TABLE "shipment_weighing_attempt";

-- CreateTable
CREATE TABLE "weighbridge_weight_record" (
    "id" UUID NOT NULL,
    "weighbridge_log_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "weight_kg" DECIMAL(18,3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "unloaded_line_ids" JSONB,
    "net_weight_kg" DECIMAL(18,3),
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighbridge_weight_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_item_group_warehouse" (
    "id" UUID NOT NULL,
    "item_group_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "md_item_group_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weighbridge_weight_record_weighbridge_log_id_idx" ON "weighbridge_weight_record"("weighbridge_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "weighbridge_weight_record_weighbridge_log_id_sequence_key" ON "weighbridge_weight_record"("weighbridge_log_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "md_item_group_warehouse_item_group_id_warehouse_id_key" ON "md_item_group_warehouse"("item_group_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "receipt_line_location_id_idx" ON "receipt_line"("location_id");

-- CreateIndex
CREATE INDEX "shipment_line_location_id_idx" ON "shipment_line"("location_id");

-- AddForeignKey
ALTER TABLE "md_warehouse" ADD CONSTRAINT "md_warehouse_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line" ADD CONSTRAINT "shipment_line_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weighbridge_weight_record" ADD CONSTRAINT "weighbridge_weight_record_weighbridge_log_id_fkey" FOREIGN KEY ("weighbridge_log_id") REFERENCES "m8_weighbridge_log"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_group_warehouse" ADD CONSTRAINT "md_item_group_warehouse_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "md_item_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_group_warehouse" ADD CONSTRAINT "md_item_group_warehouse_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
