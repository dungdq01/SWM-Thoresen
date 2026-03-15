/*
  Warnings:

  - You are about to drop the column `unit_price` on the `purchase_order_lines` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `expected_delivery_date` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `external_po_number` on the `purchase_orders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PurchaseOrderType" AS ENUM ('SEA', 'LAND');

-- DropForeignKey
ALTER TABLE "purchase_order_lines" DROP CONSTRAINT "purchase_order_lines_uom_id_fkey";

-- AlterTable
ALTER TABLE "purchase_order_lines" DROP COLUMN "unit_price",
ALTER COLUMN "uom_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "currency",
DROP COLUMN "expected_delivery_date",
DROP COLUMN "external_po_number",
ADD COLUMN     "bl_number" VARCHAR(100),
ADD COLUMN     "origin" VARCHAR(200),
ADD COLUMN     "po_type" "PurchaseOrderType" NOT NULL DEFAULT 'SEA',
ADD COLUMN     "vessel_name" VARCHAR(200);

-- CreateIndex
CREATE INDEX "purchase_orders_po_type_status_idx" ON "purchase_orders"("po_type", "status");

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
