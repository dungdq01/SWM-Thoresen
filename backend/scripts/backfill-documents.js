/**
 * Backfill InboundDocuments for LINKED OCR results that are missing documents.
 * Run: node scripts/backfill-documents.js
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { statSync, existsSync } = require('fs');
const { extname } = require('path');

const prisma = new PrismaClient();

function getFileInfo(filePath) {
  try {
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      const ext = extname(filePath).toLowerCase();
      const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
      return { size: stat.size, mimeType: mimeMap[ext] || 'application/octet-stream' };
    }
  } catch {}
  return { size: 0, mimeType: 'image/jpeg' };
}

async function main() {
  const linkedResults = await prisma.m8OcrResult.findMany({
    where: {
      status: 'LINKED',
      linkedReceiptId: { not: null },
    },
  });

  console.log(`Found ${linkedResults.length} LINKED OCR results`);

  let created = 0, skipped = 0, errors = 0;

  for (const ocr of linkedResults) {
    try {
      const existingDoc = await prisma.inboundDocument.findFirst({
        where: { receiptHeaderId: ocr.linkedReceiptId },
      });
      if (existingDoc) {
        skipped++;
        continue;
      }

      const receipt = await prisma.receiptHeader.findUnique({
        where: { id: ocr.linkedReceiptId },
        include: { owner: { select: { id: true, ownerCode: true, ownerName: true } } },
      });
      if (!receipt) {
        console.warn(`Receipt ${ocr.linkedReceiptId} not found for OCR ${ocr.id}`);
        errors++;
        continue;
      }

      let poNumber = receipt.poId || 'UNKNOWN';
      if (ocr.linkedPoId) {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: ocr.linkedPoId },
          select: { poNumber: true },
        });
        if (po) poNumber = po.poNumber;
      }

      const documentCode = ocr.ticketNumber || ocr.ocrRequestId;
      const fileInfo = getFileInfo(ocr.imagePath);
      const fileExt = extname(ocr.imagePath).toLowerCase() || '.jpg';

      await prisma.inboundDocument.create({
        data: {
          id: uuidv4(),
          documentCode,
          receiptHeaderId: ocr.linkedReceiptId,
          docType: 'WEIGHT_CERTIFICATE',
          ownerId: receipt.ownerId,
          vehicleNumber: ocr.vehicleNumber || null,
          fileName: `${poNumber}${fileExt}`,
          filePath: ocr.imagePath,
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimeType,
          notes: `OCR phiếu cân cảng - PO ${poNumber} (backfill)`,
          status: 'SCANNED',
          uploadedBy: ocr.createdBy || null,
        },
      });

      created++;
      console.log(`✅ Created document for OCR ${ocr.id}: ${documentCode}`);
    } catch (err) {
      console.error(`❌ Failed for OCR ${ocr.id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone: created=${created}, skipped=${skipped} (already had doc), errors=${errors}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
