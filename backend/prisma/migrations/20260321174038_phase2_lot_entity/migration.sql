-- AlterTable
ALTER TABLE "invent_trans" ADD COLUMN     "lot_id" UUID;

-- AlterTable
ALTER TABLE "on_hand" ADD COLUMN     "lot_id" UUID;

-- CreateTable
CREATE TABLE "lot" (
    "id" UUID NOT NULL,
    "lot_number" VARCHAR(50) NOT NULL,
    "lot_hash" VARCHAR(64) NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "vessel_id" UUID,
    "vessel_name" VARCHAR(255),
    "bl_number" VARCHAR(50),
    "country_of_origin" VARCHAR(100),
    "production_date" DATE,
    "expiry_date" DATE,
    "first_received_date" TIMESTAMP(3),
    "supplier_lot_ref" VARCHAR(100),
    "certificate_ref" VARCHAR(100),
    "lot_attributes" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lot_lot_number_key" ON "lot"("lot_number");

-- CreateIndex
CREATE UNIQUE INDEX "lot_lot_hash_key" ON "lot"("lot_hash");

-- CreateIndex
CREATE INDEX "lot_item_id_owner_id_idx" ON "lot"("item_id", "owner_id");

-- CreateIndex
CREATE INDEX "lot_vessel_id_idx" ON "lot"("vessel_id");

-- CreateIndex
CREATE INDEX "lot_bl_number_idx" ON "lot"("bl_number");

-- CreateIndex
CREATE INDEX "lot_first_received_date_idx" ON "lot"("first_received_date");

-- CreateIndex
CREATE INDEX "on_hand_lot_id_idx" ON "on_hand"("lot_id");

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "md_vessels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_hand" ADD CONSTRAINT "on_hand_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
