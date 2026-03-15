-- AlterTable
ALTER TABLE "m8_ocr_result" ADD COLUMN     "customer_confidence" DECIMAL(5,2),
ADD COLUMN     "customer_name" VARCHAR(200),
ADD COLUMN     "delivery_confidence" DECIMAL(5,2),
ADD COLUMN     "delivery_location" VARCHAR(200),
ADD COLUMN     "gross_weight" DECIMAL(18,3),
ADD COLUMN     "gross_weight_confidence" DECIMAL(5,2),
ADD COLUMN     "gross_weight_uom" VARCHAR(20),
ADD COLUMN     "tare_weight" DECIMAL(18,3),
ADD COLUMN     "tare_weight_confidence" DECIMAL(5,2),
ADD COLUMN     "tare_weight_uom" VARCHAR(20);
