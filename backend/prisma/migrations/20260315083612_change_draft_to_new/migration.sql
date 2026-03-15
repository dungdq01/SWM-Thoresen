/*
  Warnings:

  - The values [DRAFT] on the enum `PurchaseOrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PurchaseOrderStatus_new" AS ENUM ('NEW', 'CONFIRMED', 'CLOSED', 'CANCELLED');
ALTER TABLE "purchase_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "purchase_orders" ALTER COLUMN "status" TYPE "PurchaseOrderStatus_new" USING ("status"::text::"PurchaseOrderStatus_new");
ALTER TYPE "PurchaseOrderStatus" RENAME TO "PurchaseOrderStatus_old";
ALTER TYPE "PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
DROP TYPE "PurchaseOrderStatus_old";
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'NEW';
