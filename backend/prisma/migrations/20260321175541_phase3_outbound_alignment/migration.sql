-- CreateEnum
CREATE TYPE "ShipmentOrderType" AS ENUM ('STANDARD', 'CONTAINER_STUFFING', 'BULK_LOADING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SalesOrderType" ADD VALUE 'CONTAINER_STUFFING';
ALTER TYPE "SalesOrderType" ADD VALUE 'BULK_LOADING';

-- AlterTable
ALTER TABLE "sales_order_lines" ADD COLUMN     "total_shipped_qty" DECIMAL(18,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "shipment_header" ADD COLUMN     "container_number" VARCHAR(30),
ADD COLUMN     "seal_number" VARCHAR(30),
ADD COLUMN     "shipment_order_type" "ShipmentOrderType" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "shipment_line" ADD COLUMN     "weighed_qty_kg" DECIMAL(18,3);
