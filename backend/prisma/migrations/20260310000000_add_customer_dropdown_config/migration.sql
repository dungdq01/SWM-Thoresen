-- Migration: Add MdCustomer, DropdownConfig, OnHand lot_number
-- Generated: 2026-03-10

-- CreateEnum: CustomerGroup
CREATE TYPE "CustomerGroup" AS ENUM ('CORPORATE', 'INDIVIDUAL');

-- CreateEnum: CustomerType
CREATE TYPE "CustomerType" AS ENUM ('BUYER', 'CONSIGNEE', 'SHIPPER');

-- CreateTable: md_customer
CREATE TABLE "md_customer" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_code"   VARCHAR(20) NOT NULL,
    "customer_name"   VARCHAR(200) NOT NULL,
    "short_name"      VARCHAR(50),
    "customer_group"  "CustomerGroup" NOT NULL,
    "customer_type"   "CustomerType" NOT NULL,
    "tax_code"        VARCHAR(20),
    "contact_name"    VARCHAR(100),
    "phone"           VARCHAR(20),
    "email"           VARCHAR(100),
    "address"         VARCHAR(500),
    "notes"           TEXT,
    "is_active"       BOOLEAN NOT NULL DEFAULT true,
    "row_version"     BIGINT NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      UUID,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    "updated_by"      UUID,
    "deactivated_at"  TIMESTAMP(3),
    "deactivated_by"  UUID,
    CONSTRAINT "md_customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique customer_code
CREATE UNIQUE INDEX "md_customer_customer_code_key" ON "md_customer"("customer_code");

-- CreateIndex: customer_group + is_active
CREATE INDEX "md_customer_customer_group_is_active_idx" ON "md_customer"("customer_group", "is_active");

-- CreateIndex: customer_type + is_active
CREATE INDEX "md_customer_customer_type_is_active_idx" ON "md_customer"("customer_type", "is_active");

-- AddForeignKey: shipment_header.customer_id → md_customer.id
-- (customer_id column already exists from schema; only add FK constraint if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shipment_header_customer_id_fkey'
  ) THEN
    ALTER TABLE "shipment_header"
      ADD CONSTRAINT "shipment_header_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "md_customer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$$;

-- AlterTable: on_hand — add lot_number
ALTER TABLE "on_hand" ADD COLUMN IF NOT EXISTS "lot_number" VARCHAR(50);

-- CreateTable: dropdown_configs
CREATE TABLE "dropdown_configs" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity"      VARCHAR(50) NOT NULL,
    "field_name"  VARCHAR(50) NOT NULL,
    "value"       VARCHAR(50) NOT NULL,
    "label"       VARCHAR(100) NOT NULL,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "is_default"  BOOLEAN NOT NULL DEFAULT false,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dropdown_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique entity + field_name + value
CREATE UNIQUE INDEX "dropdown_configs_entity_field_name_value_key" ON "dropdown_configs"("entity", "field_name", "value");

-- CreateIndex: entity + field_name + is_active
CREATE INDEX "dropdown_configs_entity_field_name_is_active_idx" ON "dropdown_configs"("entity", "field_name", "is_active");

-- ============================================================
-- PurchaseOrder module (BE-TODO-inbound.md)
-- ============================================================

CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CLOSED', 'CANCELLED');
CREATE TYPE "PurchaseOrderLineStatus" AS ENUM ('OPEN', 'PARTIAL', 'RECEIVED', 'CANCELLED');

CREATE TABLE "purchase_orders" (
    "id"                     UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_number"              VARCHAR(40) NOT NULL,
    "external_po_number"     VARCHAR(100),
    "status"                 "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id"               UUID NOT NULL,
    "vendor_id"              UUID NOT NULL,
    "warehouse_id"           UUID NOT NULL,
    "expected_delivery_date" DATE,
    "notes"                  TEXT,
    "currency"               VARCHAR(10) NOT NULL DEFAULT 'VND',
    "total_expected_qty"     DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_received_qty"     DECIMAL(18,3) NOT NULL DEFAULT 0,
    "cancel_reason_code"     VARCHAR(50),
    "row_version"            BIGINT NOT NULL DEFAULT 0,
    "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"             UUID,
    "updated_at"             TIMESTAMP(3) NOT NULL,
    "updated_by"             UUID,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_status_created_at_idx" ON "purchase_orders"("status", "created_at" DESC);
CREATE INDEX "purchase_orders_owner_vendor_status_idx" ON "purchase_orders"("owner_id", "vendor_id", "status");

ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id"),
  ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "md_vendor"("id"),
  ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id");

CREATE TABLE "purchase_order_lines" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_id"        UUID NOT NULL,
    "line_number"  INTEGER NOT NULL,
    "item_id"      UUID NOT NULL,
    "uom_id"       UUID NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "received_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unit_price"   DECIMAL(18,4),
    "notes"        TEXT,
    "status"       "PurchaseOrderLineStatus" NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_order_lines_po_id_line_number_key" ON "purchase_order_lines"("po_id", "line_number");

ALTER TABLE "purchase_order_lines"
  ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id"),
  ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id"),
  ADD CONSTRAINT "purchase_order_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id");
