-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "md_lot" (
    "id" UUID NOT NULL,
    "lot_code" VARCHAR(50) NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "first_received_date" DATE NOT NULL,
    "source_lot_id" UUID,
    "lot_hash" VARCHAR(64) NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'ACTIVE',
    "attributes" JSONB,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "md_lot_lot_code_key" ON "md_lot"("lot_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_lot_lot_hash_key" ON "md_lot"("lot_hash");

-- CreateIndex
CREATE INDEX "md_lot_item_id_owner_id_warehouse_id_status_idx" ON "md_lot"("item_id", "owner_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "md_lot_first_received_date_idx" ON "md_lot"("first_received_date");

-- CreateIndex
CREATE INDEX "md_lot_source_lot_id_idx" ON "md_lot"("source_lot_id");

-- AddForeignKey
ALTER TABLE "md_lot" ADD CONSTRAINT "md_lot_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_lot" ADD CONSTRAINT "md_lot_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_lot" ADD CONSTRAINT "md_lot_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_lot" ADD CONSTRAINT "md_lot_source_lot_id_fkey" FOREIGN KEY ("source_lot_id") REFERENCES "md_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
