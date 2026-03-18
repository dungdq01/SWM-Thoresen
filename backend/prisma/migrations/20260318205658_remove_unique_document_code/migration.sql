-- DropIndex
DROP INDEX "inbound_document_document_code_key";

-- CreateIndex
CREATE INDEX "inbound_document_document_code_idx" ON "inbound_document"("document_code");
