-- AlterTable: Add defaultWarehouseId to md_item_groups
ALTER TABLE "md_item_groups" ADD COLUMN "default_warehouse_id" UUID;

-- AddForeignKey
ALTER TABLE "md_item_groups" ADD CONSTRAINT "md_item_groups_default_warehouse_id_fkey"
  FOREIGN KEY ("default_warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
