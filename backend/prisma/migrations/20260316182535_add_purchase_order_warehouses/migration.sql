-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_warehouse_id_fkey";

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "warehouse_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "purchase_order_warehouses" (
    "id" UUID NOT NULL,
    "po_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_order_warehouses_warehouse_id_idx" ON "purchase_order_warehouses"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_warehouses_po_id_warehouse_id_key" ON "purchase_order_warehouses"("po_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_warehouses" ADD CONSTRAINT "purchase_order_warehouses_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_warehouses" ADD CONSTRAINT "purchase_order_warehouses_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
