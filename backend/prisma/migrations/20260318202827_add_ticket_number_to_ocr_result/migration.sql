-- AlterTable
ALTER TABLE "m8_ocr_result" ADD COLUMN     "ticket_confidence" DECIMAL(5,2),
ADD COLUMN     "ticket_number" VARCHAR(50);
