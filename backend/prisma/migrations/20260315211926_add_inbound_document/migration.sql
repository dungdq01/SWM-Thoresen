/*
  Warnings:

  - You are about to drop the column `receiving_location_id` on the `receipt_header` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InboundDocumentType" AS ENUM ('BILL_OF_LADING', 'PACKING_LIST', 'COMMERCIAL_INVOICE', 'CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'WEIGHT_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "InboundDocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "receipt_header" DROP CONSTRAINT "receipt_header_receiving_location_id_fkey";

-- AlterTable
ALTER TABLE "receipt_header" DROP COLUMN "receiving_location_id",
ADD COLUMN     "notes" VARCHAR(500);

-- AlterTable
ALTER TABLE "receipt_line" ADD COLUMN     "notes" VARCHAR(500);

-- CreateTable
CREATE TABLE "inbound_document" (
    "id" UUID NOT NULL,
    "document_code" VARCHAR(50) NOT NULL,
    "receipt_header_id" UUID,
    "doc_type" "InboundDocumentType" NOT NULL,
    "owner_id" UUID,
    "vehicle_number" VARCHAR(30),
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "notes" VARCHAR(500),
    "status" "InboundDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_document_document_code_key" ON "inbound_document"("document_code");

-- CreateIndex
CREATE INDEX "inbound_document_receipt_header_id_idx" ON "inbound_document"("receipt_header_id");

-- CreateIndex
CREATE INDEX "inbound_document_owner_id_doc_type_idx" ON "inbound_document"("owner_id", "doc_type");

-- CreateIndex
CREATE INDEX "inbound_document_status_uploaded_at_idx" ON "inbound_document"("status", "uploaded_at" DESC);

-- AddForeignKey
ALTER TABLE "inbound_document" ADD CONSTRAINT "inbound_document_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_document" ADD CONSTRAINT "inbound_document_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
