-- AlterTable
ALTER TABLE "ic_transfer_order" ADD COLUMN     "is_in_transit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ic_transfer_order_line" ADD COLUMN     "gross_weight_kg" DECIMAL(18,3),
ADD COLUMN     "lot_id" UUID,
ADD COLUMN     "net_weight_kg" DECIMAL(18,3),
ADD COLUMN     "tare_weight_kg" DECIMAL(18,3),
ADD COLUMN     "weighbridge_log_id" UUID;

-- AddForeignKey
ALTER TABLE "ic_transfer_order_line" ADD CONSTRAINT "ic_transfer_order_line_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_transfer_order_line" ADD CONSTRAINT "ic_transfer_order_line_weighbridge_log_id_fkey" FOREIGN KEY ("weighbridge_log_id") REFERENCES "m8_weighbridge_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;
