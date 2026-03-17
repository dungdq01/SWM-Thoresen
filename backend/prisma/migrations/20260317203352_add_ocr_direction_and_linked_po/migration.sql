-- AlterTable
ALTER TABLE "m8_ocr_result" ADD COLUMN     "direction" VARCHAR(10),
ADD COLUMN     "linked_po_id" UUID;
