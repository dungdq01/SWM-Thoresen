/*
  Warnings:

  - The values [SUBMITTED,APPROVED,REJECTED] on the enum `InboundDocumentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InboundDocumentStatus_new" AS ENUM ('DRAFT', 'SCANNED', 'ERROR');
ALTER TABLE "inbound_document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "inbound_document" ALTER COLUMN "status" TYPE "InboundDocumentStatus_new" USING ("status"::text::"InboundDocumentStatus_new");
ALTER TYPE "InboundDocumentStatus" RENAME TO "InboundDocumentStatus_old";
ALTER TYPE "InboundDocumentStatus_new" RENAME TO "InboundDocumentStatus";
DROP TYPE "InboundDocumentStatus_old";
ALTER TABLE "inbound_document" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'WEIGHING';
ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "M8WeighEventProcessingStatus" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'RECEIVING';

-- DropForeignKey
ALTER TABLE "m8_weighbridge_log" DROP CONSTRAINT "m8_weighbridge_log_scale_device_id_fkey";

-- AlterTable
ALTER TABLE "m8_weighbridge_log" ADD COLUMN     "gross_weight_at" TIMESTAMP(3),
ADD COLUMN     "item_code" VARCHAR(50),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "owner_id" UUID,
ADD COLUMN     "tare_weight_at" TIMESTAMP(3),
ADD COLUMN     "warehouse_id" UUID,
ALTER COLUMN "scale_device_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_log" ADD CONSTRAINT "m8_weighbridge_log_scale_device_id_fkey" FOREIGN KEY ("scale_device_id") REFERENCES "m8_weighbridge_device"("device_code") ON DELETE SET NULL ON UPDATE CASCADE;
