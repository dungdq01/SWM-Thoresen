-- Migration: Inventory Stage-based Redesign
-- 1. Add new enum values to InventoryTransType
-- 2. Add new enum values to InventoryStage (+ remove ORDERED)
-- 3. Rename reserved_qty -> allocated_qty in on_hand & reconciliation_result
-- 4. Split ordered_qty -> inbound_ordered_qty + outbound_ordered_qty in on_hand
-- 5. Add stage + affect_ordered columns to inventory_event_mapping

-- ============================================================
-- 1. InventoryTransType — add new values
-- ============================================================
ALTER TYPE "InventoryTransType" ADD VALUE IF NOT EXISTS 'RECEIPT';
ALTER TYPE "InventoryTransType" ADD VALUE IF NOT EXISTS 'ISSUE';
ALTER TYPE "InventoryTransType" ADD VALUE IF NOT EXISTS 'TRANSFER_ISSUE';
ALTER TYPE "InventoryTransType" ADD VALUE IF NOT EXISTS 'TRANSFER_RECEIPT';

-- ============================================================
-- 2. InventoryStage — add new values
-- ============================================================
ALTER TYPE "InventoryStage" ADD VALUE IF NOT EXISTS 'REGISTERED';
ALTER TYPE "InventoryStage" ADD VALUE IF NOT EXISTS 'ALLOCATED';
ALTER TYPE "InventoryStage" ADD VALUE IF NOT EXISTS 'DE_ALLOCATED';
ALTER TYPE "InventoryStage" ADD VALUE IF NOT EXISTS 'DEDUCTED';

-- ============================================================
-- 3. on_hand: rename reserved_qty -> allocated_qty
-- ============================================================
ALTER TABLE "on_hand" RENAME COLUMN "reserved_qty" TO "allocated_qty";

-- ============================================================
-- 4. on_hand: split ordered_qty -> inbound_ordered_qty + outbound_ordered_qty
-- ============================================================
ALTER TABLE "on_hand" ADD COLUMN "inbound_ordered_qty" DECIMAL(18,3) NOT NULL DEFAULT 0;
ALTER TABLE "on_hand" ADD COLUMN "outbound_ordered_qty" DECIMAL(18,3) NOT NULL DEFAULT 0;

-- Migrate existing ordered_qty data to inbound_ordered_qty (best guess: ordered = inbound)
UPDATE "on_hand" SET "inbound_ordered_qty" = "ordered_qty" WHERE "ordered_qty" > 0;

-- Drop old column
ALTER TABLE "on_hand" DROP COLUMN "ordered_qty";

-- ============================================================
-- 5. inventory_reconciliation_result: rename reserved_qty -> allocated_qty
-- ============================================================
ALTER TABLE "inventory_reconciliation_result" RENAME COLUMN "reserved_qty" TO "allocated_qty";

-- ============================================================
-- 6. inventory_event_mapping: add stage + affect_ordered
-- ============================================================
ALTER TABLE "inventory_event_mapping" ADD COLUMN "stage" "InventoryStage" NOT NULL DEFAULT 'PHYSICAL';
ALTER TABLE "inventory_event_mapping" ADD COLUMN "affect_ordered" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 7. Recalculate available_qty = physical_qty - allocated_qty
-- ============================================================
UPDATE "on_hand" SET "available_qty" = "physical_qty" - "allocated_qty";
