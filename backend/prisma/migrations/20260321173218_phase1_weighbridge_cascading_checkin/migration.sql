-- CreateEnum
CREATE TYPE "M8LogMode" AS ENUM ('CHECK_IN', 'WEIGHING');

-- CreateEnum
CREATE TYPE "M8WeighDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'RESOLVED';

-- AlterTable
ALTER TABLE "m8_weighbridge_log" ADD COLUMN     "chain_warning" VARCHAR(100),
ADD COLUMN     "direction" "M8WeighDirection",
ADD COLUMN     "document_number" VARCHAR(50),
ADD COLUMN     "log_mode" "M8LogMode" NOT NULL DEFAULT 'WEIGHING',
ADD COLUMN     "previous_log_id" UUID,
ADD COLUMN     "qty_updated" DECIMAL(18,3),
ADD COLUMN     "receipt_line_id" UUID,
ADD COLUMN     "scale_ticket_id" VARCHAR(100),
ADD COLUMN     "shipment_line_id" UUID,
ADD COLUMN     "weight_only" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "md_item" ADD COLUMN     "item_group_id" UUID;

-- AlterTable
ALTER TABLE "md_item_groups" ADD COLUMN     "weighbridge_qty_uom_id" UUID;

-- AlterTable
ALTER TABLE "receipt_line" ADD COLUMN     "net_weight_kg" DECIMAL(18,3);

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_previous_log_id_idx" ON "m8_weighbridge_log"("previous_log_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_scale_ticket_id_idx" ON "m8_weighbridge_log"("scale_ticket_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_document_number_idx" ON "m8_weighbridge_log"("document_number");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_receipt_line_id_idx" ON "m8_weighbridge_log"("receipt_line_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_shipment_line_id_idx" ON "m8_weighbridge_log"("shipment_line_id");

-- CreateIndex
CREATE INDEX "md_item_item_group_id_idx" ON "md_item"("item_group_id");

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "md_item_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_log" ADD CONSTRAINT "m8_weighbridge_log_previous_log_id_fkey" FOREIGN KEY ("previous_log_id") REFERENCES "m8_weighbridge_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_log" ADD CONSTRAINT "m8_weighbridge_log_receipt_line_id_fkey" FOREIGN KEY ("receipt_line_id") REFERENCES "receipt_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_log" ADD CONSTRAINT "m8_weighbridge_log_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item_groups" ADD CONSTRAINT "md_item_groups_weighbridge_qty_uom_id_fkey" FOREIGN KEY ("weighbridge_qty_uom_id") REFERENCES "md_uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
