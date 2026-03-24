/*
  Warnings:

  - The values [ORDERED] on the enum `InventoryStage` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `inbound_ordered_qty` on the `on_hand` table. All the data in the column will be lost.
  - You are about to drop the column `outbound_ordered_qty` on the `on_hand` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InventoryStage_new" AS ENUM ('EXPECTED', 'REGISTERED', 'ALLOCATED', 'DE_ALLOCATED', 'PHYSICAL', 'DEDUCTED');
ALTER TABLE "invent_trans" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "inventory_event_mapping" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "invent_trans" ALTER COLUMN "stage" TYPE "InventoryStage_new" USING ("stage"::text::"InventoryStage_new");
ALTER TABLE "inventory_event_mapping" ALTER COLUMN "stage" TYPE "InventoryStage_new" USING ("stage"::text::"InventoryStage_new");
ALTER TYPE "InventoryStage" RENAME TO "InventoryStage_old";
ALTER TYPE "InventoryStage_new" RENAME TO "InventoryStage";
DROP TYPE "InventoryStage_old";
ALTER TABLE "invent_trans" ALTER COLUMN "stage" SET DEFAULT 'PHYSICAL';
ALTER TABLE "inventory_event_mapping" ALTER COLUMN "stage" SET DEFAULT 'PHYSICAL';
COMMIT;

-- AlterTable
ALTER TABLE "on_hand" DROP COLUMN "inbound_ordered_qty",
DROP COLUMN "outbound_ordered_qty";
