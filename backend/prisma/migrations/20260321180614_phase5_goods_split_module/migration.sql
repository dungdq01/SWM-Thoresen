-- CreateEnum
CREATE TYPE "GoodsSplitStatus" AS ENUM ('DRAFT', 'CALCULATED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsSplitDetailStatus" AS ENUM ('PENDING', 'ALLOCATED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "goods_split_header" (
    "id" UUID NOT NULL,
    "split_number" VARCHAR(50) NOT NULL,
    "source_receipt_id" UUID NOT NULL,
    "source_po_id" VARCHAR(50),
    "original_owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "total_qty" DECIMAL(18,3) NOT NULL,
    "total_qty_kg" DECIMAL(18,3) NOT NULL,
    "uom_id" UUID NOT NULL,
    "allocated_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unallocated_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "rounding_diff_kg" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "tolerance_pct" DECIMAL(8,4) NOT NULL DEFAULT 1,
    "status" "GoodsSplitStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "lot_id" UUID,
    "cancel_reason_code" VARCHAR(50),
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "goods_split_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_split_detail" (
    "id" UUID NOT NULL,
    "split_header_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "target_owner_id" UUID NOT NULL,
    "allocation_pct" DECIMAL(8,4) NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "expected_qty_kg" DECIMAL(18,3) NOT NULL,
    "actual_qty" DECIMAL(18,3),
    "actual_qty_kg" DECIMAL(18,3),
    "rounding_adj_kg" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "target_location_id" UUID,
    "status" "GoodsSplitDetailStatus" NOT NULL DEFAULT 'PENDING',
    "posted_trans_id" VARCHAR(40),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "goods_split_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_split_transaction" (
    "id" UUID NOT NULL,
    "split_header_id" UUID NOT NULL,
    "split_detail_id" UUID,
    "trans_type" VARCHAR(30) NOT NULL,
    "from_owner_id" UUID NOT NULL,
    "to_owner_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "uom_id" UUID NOT NULL,
    "invent_trans_id" VARCHAR(40),
    "correlation_id" VARCHAR(120) NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "posted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_split_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goods_split_header_split_number_key" ON "goods_split_header"("split_number");

-- CreateIndex
CREATE UNIQUE INDEX "goods_split_header_external_id_key" ON "goods_split_header"("external_id");

-- CreateIndex
CREATE INDEX "goods_split_header_source_receipt_id_status_idx" ON "goods_split_header"("source_receipt_id", "status");

-- CreateIndex
CREATE INDEX "goods_split_header_original_owner_id_warehouse_id_status_idx" ON "goods_split_header"("original_owner_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "goods_split_header_status_created_at_idx" ON "goods_split_header"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "goods_split_header_correlation_id_idx" ON "goods_split_header"("correlation_id");

-- CreateIndex
CREATE INDEX "goods_split_detail_target_owner_id_status_idx" ON "goods_split_detail"("target_owner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "goods_split_detail_split_header_id_line_number_key" ON "goods_split_detail"("split_header_id", "line_number");

-- CreateIndex
CREATE INDEX "goods_split_transaction_split_header_id_idx" ON "goods_split_transaction"("split_header_id");

-- CreateIndex
CREATE INDEX "goods_split_transaction_from_owner_id_to_owner_id_idx" ON "goods_split_transaction"("from_owner_id", "to_owner_id");

-- CreateIndex
CREATE INDEX "goods_split_transaction_invent_trans_id_idx" ON "goods_split_transaction"("invent_trans_id");

-- AddForeignKey
ALTER TABLE "goods_split_header" ADD CONSTRAINT "goods_split_header_original_owner_id_fkey" FOREIGN KEY ("original_owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_header" ADD CONSTRAINT "goods_split_header_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_header" ADD CONSTRAINT "goods_split_header_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_header" ADD CONSTRAINT "goods_split_header_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_detail" ADD CONSTRAINT "goods_split_detail_split_header_id_fkey" FOREIGN KEY ("split_header_id") REFERENCES "goods_split_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_detail" ADD CONSTRAINT "goods_split_detail_target_owner_id_fkey" FOREIGN KEY ("target_owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_split_transaction" ADD CONSTRAINT "goods_split_transaction_split_header_id_fkey" FOREIGN KEY ("split_header_id") REFERENCES "goods_split_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
