-- CreateEnum
CREATE TYPE "OutboundDocumentType" AS ENUM ('BILL_OF_LADING', 'PACKING_LIST', 'COMMERCIAL_INVOICE', 'DELIVERY_ORDER', 'WEIGHT_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "OutboundDocumentStatus" AS ENUM ('DRAFT', 'SCANNED', 'ERROR');

-- AlterTable
ALTER TABLE "m8_ocr_result" ADD COLUMN     "linked_shipment_id" UUID,
ADD COLUMN     "linked_so_id" UUID;

-- CreateTable
CREATE TABLE "outbound_document" (
    "id" UUID NOT NULL,
    "document_code" VARCHAR(50) NOT NULL,
    "shipment_header_id" UUID,
    "doc_type" "OutboundDocumentType" NOT NULL,
    "owner_id" UUID,
    "vehicle_number" VARCHAR(30),
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "notes" VARCHAR(500),
    "status" "OutboundDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbound_document_document_code_idx" ON "outbound_document"("document_code");

-- CreateIndex
CREATE INDEX "outbound_document_shipment_header_id_idx" ON "outbound_document"("shipment_header_id");

-- CreateIndex
CREATE INDEX "outbound_document_owner_id_doc_type_idx" ON "outbound_document"("owner_id", "doc_type");

-- CreateIndex
CREATE INDEX "outbound_document_status_uploaded_at_idx" ON "outbound_document"("status", "uploaded_at" DESC);

-- AddForeignKey
ALTER TABLE "outbound_document" ADD CONSTRAINT "outbound_document_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_document" ADD CONSTRAINT "outbound_document_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
