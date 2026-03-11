-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'SHIPPED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderLineStatus" AS ENUM ('OPEN', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'SHIPPED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderType" AS ENUM ('STANDARD', 'CONSIGNMENT', 'INTERNAL');

-- AlterTable
ALTER TABLE "ic_adjustment_line" ADD COLUMN     "note" VARCHAR(500);

-- AlterTable
ALTER TABLE "shipment_header" ADD COLUMN     "sales_order_id" UUID;

-- AlterTable
ALTER TABLE "shipment_so_link" ADD COLUMN     "sales_order_id" UUID,
ADD COLUMN     "sales_order_line_id" UUID;

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL,
    "so_number" VARCHAR(40) NOT NULL,
    "external_so_number" VARCHAR(100),
    "order_type" "SalesOrderType" NOT NULL DEFAULT 'STANDARD',
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "expected_delivery_date" DATE,
    "delivery_address" VARCHAR(500),
    "notes" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "total_expected_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_released_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_shipped_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "cancel_reason_code" VARCHAR(50),
    "closed_at" TIMESTAMP(3),
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" UUID NOT NULL,
    "so_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "cargo_form" "CargoForm" NOT NULL,
    "uom_id" UUID NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "expected_qty_kg" DECIMAL(18,3) NOT NULL,
    "released_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "shipped_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,4),
    "bag_count" INTEGER,
    "nominal_weight_per_bag" DECIMAL(18,3),
    "notes" TEXT,
    "status" "SalesOrderLineStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_status_history" (
    "id" UUID NOT NULL,
    "so_id" UUID NOT NULL,
    "so_line_id" UUID,
    "entity_level" VARCHAR(10) NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "trigger_action" VARCHAR(50) NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason_code" VARCHAR(50),
    "note" TEXT,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "sales_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_so_number_key" ON "sales_orders"("so_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_external_id_key" ON "sales_orders"("external_id");

-- CreateIndex
CREATE INDEX "sales_orders_status_created_at_idx" ON "sales_orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sales_orders_owner_id_customer_id_status_idx" ON "sales_orders"("owner_id", "customer_id", "status");

-- CreateIndex
CREATE INDEX "sales_orders_so_number_idx" ON "sales_orders"("so_number");

-- CreateIndex
CREATE INDEX "sales_orders_external_so_number_idx" ON "sales_orders"("external_so_number");

-- CreateIndex
CREATE INDEX "sales_orders_correlation_id_idx" ON "sales_orders"("correlation_id");

-- CreateIndex
CREATE INDEX "sales_order_lines_item_id_cargo_form_idx" ON "sales_order_lines"("item_id", "cargo_form");

-- CreateIndex
CREATE INDEX "sales_order_lines_so_id_status_idx" ON "sales_order_lines"("so_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_lines_so_id_line_number_key" ON "sales_order_lines"("so_id", "line_number");

-- CreateIndex
CREATE INDEX "sales_order_status_history_so_id_changed_at_idx" ON "sales_order_status_history"("so_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "sales_order_status_history_so_line_id_changed_at_idx" ON "sales_order_status_history"("so_line_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "sales_order_status_history_to_status_changed_at_idx" ON "sales_order_status_history"("to_status", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_so_link_sales_order_id_sales_order_line_id_idx" ON "shipment_so_link"("sales_order_id", "sales_order_line_id");

-- AddForeignKey
ALTER TABLE "shipment_header" ADD CONSTRAINT "shipment_header_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_so_link" ADD CONSTRAINT "shipment_so_link_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_so_link" ADD CONSTRAINT "shipment_so_link_sales_order_line_id_fkey" FOREIGN KEY ("sales_order_line_id") REFERENCES "sales_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "md_customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_status_history" ADD CONSTRAINT "sales_order_status_history_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
