import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { OcrStatus, OcrLinkMethod } from '../domain/integration.enums';
import { v4 as uuidv4 } from 'uuid';
import { statSync, existsSync } from 'fs';
import { extname, basename } from 'path';

// ═══════════════════════════════════════════════════════════════════
//  Scoring thresholds for PO matching
// ═══════════════════════════════════════════════════════════════════
const MATCH_THRESHOLD = 25;

interface PoCandidate {
  id: string;
  poNumber: string;
  blNumber: string | null;
  vesselName: string | null;
  ownerId: string;
  vendorId: string;
  warehouseId: string | null;
  totalExpectedQty: any;
  owner: { id: string; ownerCode: string; ownerName: string };
  lines: Array<{
    id: string;
    itemId: string;
    uomId: string | null;
    expectedQty: any;
    lineNumber: number;
    item: { itemCode: string; itemName: string };
  }>;
}

interface OcrData {
  id: string;
  ocrRequestId: string;
  ticketNumber?: string | null;
  blNumber?: string | null;
  vehicleNumber: string | null;
  customerName: string | null;
  vesselName: string | null;
  productName: string | null;
  grossWeight: any;
  tareWeight: any;
  qtyExtracted: any;
  imagePath: string;
  createdBy: string;
  createdAt: Date;
  correlationId: string;
}

interface SoCandidate {
  id: string;
  soNumber: string;
  externalSoNumber: string | null;
  ownerId: string;
  warehouseId: string;
  totalExpectedQtyKg: any;
  owner: { id: string; ownerCode: string; ownerName: string };
  lines: Array<{
    id: string;
    itemId: string;
    uomId: string | null;
    expectedQty: any;
    lineNumber: number;
    item: { itemCode: string; itemName: string };
  }>;
}

interface SoMatchResult {
  so: SoCandidate;
  score: number;
  matchDetails: string[];
}

// Helper to get file info safely
function getFileInfo(filePath: string): { size: number; mimeType: string } {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      const ext = extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
        '.webp': 'image/webp',
      };
      return {
        size: stats.size,
        mimeType: mimeMap[ext] || 'image/jpeg',
      };
    }
  } catch {
    // Ignore file access errors
  }
  return { size: 0, mimeType: 'image/jpeg' };
}

interface MatchResult {
  po: PoCandidate;
  score: number;
  matchDetails: string[];
}

@Injectable()
export class OcrAutoLinkService {
  private readonly logger = new Logger(OcrAutoLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrResultRepo: OcrResultRepository,
  ) {}

  /**
   * After OCR extraction completes for an INBOUND direction scan,
   * attempt to auto-match to a SEA PO and create receipt + document.
   */
  async autoLinkInbound(ocrResultId: string): Promise<void> {
    const ocrResult = await this.ocrResultRepo.findById(ocrResultId);
    if (!ocrResult) {
      this.logger.warn(`OCR result ${ocrResultId} not found for auto-link`);
      return;
    }

    // Only process INBOUND direction
    if (ocrResult.direction !== 'INBOUND') {
      this.logger.log(`Skipping auto-link: direction is ${ocrResult.direction}`);
      return;
    }

    // Only process EXTRACTED or REVIEW_REQUIRED
    if (![OcrStatus.EXTRACTED, OcrStatus.REVIEW_REQUIRED].includes(ocrResult.status as OcrStatus)) {
      this.logger.log(`Skipping auto-link: status is ${ocrResult.status}`);
      return;
    }

    try {
      // 1. Find candidate SEA POs
      const candidates = await this.findSeaPoCandidates();
      if (candidates.length === 0) {
        this.logger.warn('No SEA POs found for matching');
        return;
      }

      // 2. Score each PO
      const match = this.findBestMatch(ocrResult as OcrData, candidates);
      if (!match || match.score < MATCH_THRESHOLD) {
        this.logger.log(
          `No PO match above threshold (${MATCH_THRESHOLD}). Best: ${match?.score ?? 0} for ${match?.po.poNumber ?? 'none'}`,
        );
        return;
      }

      this.logger.log(
        `Matched PO ${match.po.poNumber} with score ${match.score}: ${match.matchDetails.join(', ')}`,
      );

      // 3. Create receipt + document + link OCR in a single transaction
      await this.createReceiptAndDocument(ocrResult as OcrData, match.po);

    } catch (error) {
      const err = error as any;
      this.logger.error(`Auto-link failed for OCR ${ocrResultId}: ${err?.message || err}`);
      this.logger.error(`Auto-link error stack: ${err?.stack || 'no stack'}`);
      // Don't throw — auto-link failure shouldn't break the OCR flow
    }
  }

  // ─── Find SEA POs that are open for matching ────────────────────
  private async findSeaPoCandidates(): Promise<PoCandidate[]> {
    return this.prisma.purchaseOrder.findMany({
      where: {
        poType: 'SEA',
        status: { in: ['CONFIRMED', 'RECEIVING'] },
      },
      include: {
        owner: {
          select: { id: true, ownerCode: true, ownerName: true },
        },
        lines: {
          select: {
            id: true,
            itemId: true,
            uomId: true,
            expectedQty: true,
            lineNumber: true,
            item: { select: { itemCode: true, itemName: true } },
          },
          where: { status: 'OPEN' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as PoCandidate[];
  }

  // ─── Scoring algorithm ──────────────────────────────────────────
  // Logic: số PO không có trên phiếu cân.
  // Lấy thông tin từ ảnh OCR (tên tàu, khách hàng, nhóm hàng) so sánh với PO để tìm đúng PO.
  // Thứ tự ưu tiên: Tên tàu (50đ) → Khách hàng/Owner (30đ) → Nhóm hàng (20đ) → Trọng lượng (5đ)
  private findBestMatch(ocrData: OcrData, candidates: PoCandidate[]): MatchResult | null {
    let best: MatchResult | null = null;

    for (const po of candidates) {
      let score = 0;
      const details: string[] = [];

      // Priority 1: Tên tàu (vesselName) — định danh chính xác nhất (+50)
      if (ocrData.vesselName && po.vesselName) {
        const ocrVessel = this.normalize(ocrData.vesselName);
        const poVessel = this.normalize(po.vesselName);
        if (ocrVessel === poVessel) {
          score += 50;
          details.push(`Vessel exact: ${ocrVessel}`);
        } else if (ocrVessel.includes(poVessel) || poVessel.includes(ocrVessel)) {
          score += 35;
          details.push(`Vessel partial: ${ocrVessel} ~ ${poVessel}`);
        }
      }

      // Priority 2: Khách hàng (customerName ↔ owner) (+30)
      if (ocrData.customerName && po.owner) {
        const ocrCustomer = this.normalize(ocrData.customerName);
        const ownerCode = this.normalize(po.owner.ownerCode);
        const ownerName = this.normalize(po.owner.ownerName);
        if (ocrCustomer === ownerCode || ocrCustomer === ownerName) {
          score += 30;
          details.push(`Customer exact: ${ocrCustomer}`);
        } else if (
          ocrCustomer.includes(ownerCode) || ownerCode.includes(ocrCustomer) ||
          ocrCustomer.includes(ownerName) || ownerName.includes(ocrCustomer)
        ) {
          score += 20;
          details.push(`Customer partial: ${ocrCustomer} ~ ${ownerCode}`);
        }
      }

      // Priority 3: Nhóm hàng / tên hàng (productName ↔ PO line items) (+20)
      if (ocrData.productName && po.lines.length > 0) {
        const ocrProduct = this.normalize(ocrData.productName);
        for (const line of po.lines) {
          const itemCode = this.normalize(line.item.itemCode);
          const itemName = this.normalize(line.item.itemName);
          if (ocrProduct === itemCode || ocrProduct === itemName) {
            score += 20;
            details.push(`Product exact: ${ocrProduct}`);
            break;
          }
          if (
            itemCode.includes(ocrProduct) || ocrProduct.includes(itemCode) ||
            itemName.includes(ocrProduct) || ocrProduct.includes(itemName)
          ) {
            score += 12;
            details.push(`Product partial: ${ocrProduct} ~ ${itemName}`);
            break;
          }
        }
      }

      // Priority 4: Trọng lượng gần với PO (+5, tiebreaker)
      if (ocrData.qtyExtracted && po.totalExpectedQty) {
        const ocrQty = Number(ocrData.qtyExtracted);
        const poQty = Number(po.totalExpectedQty);
        if (poQty > 0 && ocrQty > 0) {
          const ratio = ocrQty / poQty;
          if (ratio >= 0.5 && ratio <= 1.5) {
            score += 5;
            details.push(`Weight proximity: ${ocrQty}/${poQty}`);
          }
        }
      }

      if (!best || score > best.score) {
        best = { po, score, matchDetails: details };
      }
    }

    return best;
  }

  // ─── Create Receipt + InboundDocument + Link OCR ────────────────
  private async createReceiptAndDocument(ocrData: OcrData, po: PoCandidate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Generate ASN number
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const asnPrefix = `ASN-${today}-`;
      const existingAsns = await tx.receiptHeader.findMany({
        where: { asnId: { startsWith: asnPrefix } },
        select: { asnId: true },
      });
      const asnNumbers = existingAsns
        .map((r) => parseInt(r.asnId?.replace(asnPrefix, '') || '0', 10))
        .filter((n) => !isNaN(n));
      const nextAsnNum = asnNumbers.length > 0 ? Math.max(...asnNumbers) + 1 : 1;
      const asnId = `${asnPrefix}${String(nextAsnNum).padStart(3, '0')}`;

      // 2. Create ReceiptHeader
      const receiptId = uuidv4();
      const externalId = `ocr-rcpt-${Date.now()}-${uuidv4().slice(0, 8)}`;
      const correlationId = ocrData.correlationId || uuidv4();

      const firstLine = po.lines[0];
      const expectedQty = ocrData.qtyExtracted
        ? Number(ocrData.qtyExtracted)
        : Number(po.totalExpectedQty);

      // Need a warehouse — use PO warehouse or first available
      let warehouseId = po.warehouseId;
      if (!warehouseId) {
        const defaultWh = await tx.mdWarehouse.findFirst({ select: { id: true } });
        warehouseId = defaultWh?.id || null;
      }

      if (!warehouseId) {
        this.logger.warn('No warehouse found — skipping auto receipt creation');
        return;
      }

      await tx.receiptHeader.create({
        data: {
          id: receiptId,
          receiptType: 'VESSEL',
          poId: po.poNumber,
          asnId,
          ownerId: po.ownerId,
          vendorId: po.vendorId,
          warehouseId,
          vehicleNumber: ocrData.vehicleNumber || 'OCR-PENDING',
          blNumber: ocrData.blNumber || po.blNumber || null,
          expectedQty,
          grossWeightKg: ocrData.grossWeight ? Number(ocrData.grossWeight) : null,
          tareWeightKg: ocrData.tareWeight ? Number(ocrData.tareWeight) : null,
          netWeightKg: ocrData.qtyExtracted ? Number(ocrData.qtyExtracted) : null,
          notes: `Tự động tạo từ OCR - Phiếu cân cảng`,
          status: 'DRAFT',
          externalId,
          correlationId,
          sourceApp: 'INTEGRATION',
          createdBy: ocrData.createdBy || null,
        },
      });

      // 3. Create ReceiptLine(s) from PO lines
      if (po.lines.length > 0) {
        await tx.receiptLine.createMany({
          data: po.lines.map((line, index) => ({
            receiptHeaderId: receiptId,
            lineNumber: index + 1,
            itemId: line.itemId,
            uomId: line.uomId || line.itemId,
            expectedQty: po.lines.length === 1
              ? expectedQty
              : Number(line.expectedQty),
            cargoForm: 'BULK',
          })),
        });
      }

      // 4. Create ReceiptStatusHistory
      await tx.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: 'DRAFT',
          toStatus: 'DRAFT',
          transitionCode: 'OCR_AUTO_CREATE',
          triggeredBy: ocrData.createdBy || null,
          note: `Tự động tạo từ OCR scan - matched PO ${po.poNumber}`,
          correlationId,
        },
      });

      // 5. Determine document code from OCR ticketNumber (số phiếu cân) or fallback to ocrRequestId
      // User requirement: Mã CT = số phiếu cân từ kết quả OCR
      const documentCode = ocrData.ticketNumber || ocrData.ocrRequestId;

      // 6. Create InboundDocument (Phiếu cân cảng)
      // User requirements:
      // - Mã CT: số phiếu từ OCR (blNumber)
      // - Số Phiếu nhập: ASN (via receiptHeaderId → receiptHeader.asnId)
      // - Số xe: vehicleNumber từ OCR
      // - Loại chứng từ: WEIGHT_CERTIFICATE (Phiếu cân cảng)
      // - Tên file: Mã PO + extension, clickable to preview
      // - Ngày upload: OCR timestamp (uploadedAt auto from DB)
      // - Trạng thái: SCANNED if linked successfully
      const fileInfo = getFileInfo(ocrData.imagePath);
      const fileExt = extname(ocrData.imagePath).toLowerCase() || '.jpg';
      const docId = uuidv4();
      
      this.logger.log(`Creating InboundDocument: code=${documentCode}, file=${ocrData.imagePath}, size=${fileInfo.size}`);
      
      await tx.inboundDocument.create({
        data: {
          id: docId,
          documentCode,                           // Mã CT = số phiếu OCR
          receiptHeaderId: receiptId,             // Links to ASN (số phiếu nhập)
          docType: 'WEIGHT_CERTIFICATE',          // Loại chứng từ: Phiếu cân cảng
          ownerId: po.ownerId,                    // Chủ hàng from matched PO
          vehicleNumber: ocrData.vehicleNumber || null,  // Số xe từ OCR
          fileName: `${po.poNumber}${fileExt}`,   // Tên file: Mã PO + extension
          filePath: ocrData.imagePath,            // Path to OCR image for preview
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimeType,
          notes: `OCR phiếu cân cảng - PO ${po.poNumber}`,
          status: 'SCANNED',                      // Trạng thái: Đã scan (linked successfully)
          uploadedBy: ocrData.createdBy || null,
        },
      });
      
      this.logger.log(`InboundDocument created: ${docId}, code: ${documentCode}, fileName: ${po.poNumber}${fileExt}`);

      // 7. Update OCR result → LINKED
      await tx.m8OcrResult.update({
        where: { id: ocrData.id },
        data: {
          linkedReceiptId: receiptId,
          linkedPoId: po.id,
          linkMethod: 'AUTO_MATCHED',
          status: OcrStatus.LINKED,
        },
      });

      this.logger.log(
        `Auto-linked OCR ${ocrData.id} → PO ${po.poNumber}, Receipt ${asnId}, Document ${documentCode}`,
      );
    });
  }

  // ─── Backfill documents for existing LINKED OCR results ─────────
  async backfillDocumentsForLinkedOcr(): Promise<{ created: number; skipped: number; errors: number }> {
    const linkedResults = await this.prisma.m8OcrResult.findMany({
      where: {
        status: OcrStatus.LINKED,
        linkedReceiptId: { not: null },
      },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const ocr of linkedResults) {
      try {
        // Check if document already exists for this receipt
        const existingDoc = await this.prisma.inboundDocument.findFirst({
          where: { receiptHeaderId: ocr.linkedReceiptId },
        });
        if (existingDoc) {
          skipped++;
          continue;
        }

        // Get the receipt and PO info
        const receipt = await this.prisma.receiptHeader.findUnique({
          where: { id: ocr.linkedReceiptId! },
          include: {
            owner: { select: { id: true, ownerCode: true, ownerName: true } },
          },
        });
        if (!receipt) {
          this.logger.warn(`Receipt ${ocr.linkedReceiptId} not found for OCR ${ocr.id}`);
          errors++;
          continue;
        }

        // Get PO info if available
        let poNumber = receipt.poId || 'UNKNOWN';
        if (ocr.linkedPoId) {
          const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: ocr.linkedPoId },
            select: { poNumber: true },
          });
          if (po) poNumber = po.poNumber;
        }

        // Create InboundDocument
        const documentCode = ocr.ticketNumber || ocr.ocrRequestId;
        const fileInfo = getFileInfo(ocr.imagePath);
        const fileExt = extname(ocr.imagePath).toLowerCase() || '.jpg';

        await this.prisma.inboundDocument.create({
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
        this.logger.log(`Backfilled document for OCR ${ocr.id}: ${documentCode}`);
      } catch (err: any) {
        this.logger.error(`Failed to backfill document for OCR ${ocr.id}: ${err?.message}`);
        errors++;
      }
    }

    this.logger.log(`Backfill complete: created=${created}, skipped=${skipped}, errors=${errors}`);
    return { created, skipped, errors };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  OUTBOUND: Auto-link OCR → Sales Order → Shipment + Document
  // ═══════════════════════════════════════════════════════════════════

  /**
   * After OCR extraction completes for an OUTBOUND direction scan,
   * attempt to auto-match to a SEA SO and create shipment + outbound document.
   */
  async autoLinkOutbound(ocrResultId: string): Promise<void> {
    const ocrResult = await this.ocrResultRepo.findById(ocrResultId);
    if (!ocrResult) {
      this.logger.warn(`OCR result ${ocrResultId} not found for outbound auto-link`);
      return;
    }

    // Only process OUTBOUND direction
    if (ocrResult.direction !== 'OUTBOUND') {
      this.logger.log(`Skipping outbound auto-link: direction is ${ocrResult.direction}`);
      return;
    }

    // Only process EXTRACTED or REVIEW_REQUIRED
    if (![OcrStatus.EXTRACTED, OcrStatus.REVIEW_REQUIRED].includes(ocrResult.status as OcrStatus)) {
      this.logger.log(`Skipping outbound auto-link: status is ${ocrResult.status}`);
      return;
    }

    try {
      // 1. Find candidate CONFIRMED SOs (SEA type)
      const candidates = await this.findSoCandidates();
      if (candidates.length === 0) {
        this.logger.warn('No CONFIRMED SOs found for outbound matching');
        return;
      }

      // 2. Score each SO (reuse same scoring logic as inbound)
      const match = this.findBestSoMatch(ocrResult as OcrData, candidates);
      if (!match || match.score < MATCH_THRESHOLD) {
        this.logger.log(
          `No SO match above threshold (${MATCH_THRESHOLD}). Best: ${match?.score ?? 0} for ${match?.so.soNumber ?? 'none'}`,
        );
        return;
      }

      this.logger.log(
        `Matched SO ${match.so.soNumber} with score ${match.score}: ${match.matchDetails.join(', ')}`,
      );

      // 3. Create shipment + outbound document + link OCR
      await this.createShipmentAndDocument(ocrResult as OcrData, match.so);

    } catch (error) {
      const err = error as any;
      this.logger.error(`Outbound auto-link failed for OCR ${ocrResultId}: ${err?.message || err}`);
      this.logger.error(`Outbound auto-link error stack: ${err?.stack || 'no stack'}`);
    }
  }

  // ─── Find CONFIRMED SEA SOs for matching ───────────────────────
  private async findSoCandidates(): Promise<SoCandidate[]> {
    return this.prisma.salesOrder.findMany({
      where: {
        orderType: 'STANDARD', // SEA type maps to STANDARD in schema
        status: { in: ['CONFIRMED', 'PARTIALLY_RELEASED'] },
      },
      include: {
        owner: {
          select: { id: true, ownerCode: true, ownerName: true },
        },
        lines: {
          select: {
            id: true,
            itemId: true,
            uomId: true,
            expectedQty: true,
            lineNumber: true,
            item: { select: { itemCode: true, itemName: true } },
          },
          where: { status: 'OPEN' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as SoCandidate[];
  }

  // ─── Scoring: OCR data → SO candidate ─────────────────────────
  private findBestSoMatch(ocrData: OcrData, candidates: SoCandidate[]): SoMatchResult | null {
    let best: SoMatchResult | null = null;

    for (const so of candidates) {
      let score = 0;
      const details: string[] = [];

      // Priority 1: Tên tàu (vesselName) — SO doesn't have vesselName directly,
      // but externalSoNumber might contain B/L info; skip vessel for SO matching
      // unless we match via shipment. Instead, use customerName ↔ owner as primary.

      // Priority 1: Khách hàng / Owner (+50 for SO — more important since no vessel on SO)
      if (ocrData.customerName && so.owner) {
        const ocrCustomer = this.normalize(ocrData.customerName);
        const ownerCode = this.normalize(so.owner.ownerCode);
        const ownerName = this.normalize(so.owner.ownerName);
        if (ocrCustomer === ownerCode || ocrCustomer === ownerName) {
          score += 50;
          details.push(`Customer exact: ${ocrCustomer}`);
        } else if (
          ocrCustomer.includes(ownerCode) || ownerCode.includes(ocrCustomer) ||
          ocrCustomer.includes(ownerName) || ownerName.includes(ocrCustomer)
        ) {
          score += 35;
          details.push(`Customer partial: ${ocrCustomer} ~ ${ownerCode}`);
        }
      }

      // Priority 2: Nhóm hàng / tên hàng (productName ↔ SO line items) (+30)
      if (ocrData.productName && so.lines.length > 0) {
        const ocrProduct = this.normalize(ocrData.productName);
        for (const line of so.lines) {
          const itemCode = this.normalize(line.item.itemCode);
          const itemName = this.normalize(line.item.itemName);
          if (ocrProduct === itemCode || ocrProduct === itemName) {
            score += 30;
            details.push(`Product exact: ${ocrProduct}`);
            break;
          }
          if (
            itemCode.includes(ocrProduct) || ocrProduct.includes(itemCode) ||
            itemName.includes(ocrProduct) || ocrProduct.includes(itemName)
          ) {
            score += 20;
            details.push(`Product partial: ${ocrProduct} ~ ${itemName}`);
            break;
          }
        }
      }

      // Priority 3: Tên tàu (vesselName) — check against SO B/L or notes (+20)
      if (ocrData.vesselName) {
        const ocrVessel = this.normalize(ocrData.vesselName);
        // SO externalSoNumber stores B/L which sometimes contains vessel info
        if (so.externalSoNumber) {
          const soBlNorm = this.normalize(so.externalSoNumber);
          if (soBlNorm.includes(ocrVessel) || ocrVessel.includes(soBlNorm)) {
            score += 15;
            details.push(`Vessel in B/L: ${ocrVessel} ~ ${soBlNorm}`);
          }
        }
      }

      // Priority 4: Trọng lượng gần với SO totalExpectedQtyKg (+5, tiebreaker)
      if (ocrData.qtyExtracted && so.totalExpectedQtyKg) {
        const ocrQty = Number(ocrData.qtyExtracted);
        const soQty = Number(so.totalExpectedQtyKg);
        if (soQty > 0 && ocrQty > 0) {
          const ratio = ocrQty / soQty;
          if (ratio >= 0.01 && ratio <= 1.5) {
            score += 5;
            details.push(`Weight proximity: ${ocrQty}/${soQty}`);
          }
        }
      }

      if (!best || score > best.score) {
        best = { so, score, matchDetails: details };
      }
    }

    return best;
  }

  // ─── Create Shipment + OutboundDocument + Link OCR ─────────────
  private async createShipmentAndDocument(ocrData: OcrData, so: SoCandidate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Generate shipment number
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const shpPrefix = `SHP-${today}-`;
      const existingShps = await tx.shipmentHeader.findMany({
        where: { shipmentNumber: { startsWith: shpPrefix } },
        select: { shipmentNumber: true },
      });
      const shpNumbers = existingShps
        .map((s) => parseInt(s.shipmentNumber?.replace(shpPrefix, '') || '0', 10))
        .filter((n) => !isNaN(n));
      const nextShpNum = shpNumbers.length > 0 ? Math.max(...shpNumbers) + 1 : 1;
      const shipmentNumber = `${shpPrefix}${String(nextShpNum).padStart(3, '0')}`;

      // 2. Create ShipmentHeader
      const shipmentId = uuidv4();
      const externalId = `ocr-shp-${Date.now()}-${uuidv4().slice(0, 8)}`;
      const correlationId = ocrData.correlationId || uuidv4();

      const expectedQty = ocrData.qtyExtracted
        ? Number(ocrData.qtyExtracted)
        : Number(so.totalExpectedQtyKg);

      await tx.shipmentHeader.create({
        data: {
          id: shipmentId,
          shipmentNumber,
          soId: so.soNumber,
          salesOrderId: so.id,
          sourceType: 'SO',
          ownerId: so.ownerId,
          warehouseId: so.warehouseId,
          vehicleNumber: ocrData.vehicleNumber || 'OCR-PENDING',
          notes: `Tự động tạo từ OCR xuất kho - matched SO ${so.soNumber}`,
          status: 'DRAFT',
          externalId,
          correlationId,
          sourceApp: 'INTEGRATION',
          createdBy: ocrData.createdBy || null,
        },
      });

      // 3. Create ShipmentLine(s) from SO lines
      if (so.lines.length > 0) {
        await tx.shipmentLine.createMany({
          data: so.lines.map((line, index) => ({
            shipmentHeaderId: shipmentId,
            lineNumber: index + 1,
            soLineId: line.id,
            itemId: line.itemId,
            cargoForm: 'BULK' as any,
            uomId: line.uomId || line.itemId,
            expectedQty: so.lines.length === 1
              ? expectedQty
              : Number(line.expectedQty),
            expectedQtyKg: so.lines.length === 1
              ? expectedQty
              : Number(line.expectedQty),
            lineStatus: 'PENDING' as any,
            createdBy: ocrData.createdBy || null,
          })),
        });
      }

      // 4. Create ShipmentStatusHistory
      await tx.shipmentStatusHistory.create({
        data: {
          shipmentHeaderId: shipmentId,
          entityLevel: 'HEADER',
          fromStatus: 'DRAFT',
          toStatus: 'DRAFT',
          triggerAction: 'OCR_AUTO_CREATE',
          changedBy: ocrData.createdBy || null,
          note: `Tự động tạo từ OCR scan - matched SO ${so.soNumber}`,
          correlationId,
        },
      });

      // 5. Determine document code
      const documentCode = ocrData.ticketNumber || ocrData.ocrRequestId;

      // 6. Create OutboundDocument (Phiếu cân cảng xuất)
      const fileInfo = getFileInfo(ocrData.imagePath);
      const fileExt = extname(ocrData.imagePath).toLowerCase() || '.jpg';
      const docId = uuidv4();

      this.logger.log(`Creating OutboundDocument: code=${documentCode}, file=${ocrData.imagePath}`);

      await tx.outboundDocument.create({
        data: {
          id: docId,
          documentCode,
          shipmentHeaderId: shipmentId,
          docType: 'WEIGHT_CERTIFICATE',
          ownerId: so.ownerId,
          vehicleNumber: ocrData.vehicleNumber || null,
          fileName: `${so.soNumber}${fileExt}`,
          filePath: ocrData.imagePath,
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimeType,
          notes: `OCR phiếu cân cảng xuất - SO ${so.soNumber}`,
          status: 'SCANNED',
          uploadedBy: ocrData.createdBy || null,
        },
      });

      this.logger.log(`OutboundDocument created: ${docId}, code: ${documentCode}`);

      // 7. Update OCR result → LINKED
      await tx.m8OcrResult.update({
        where: { id: ocrData.id },
        data: {
          linkedShipmentId: shipmentId,
          linkedSoId: so.id,
          linkMethod: 'AUTO_MATCHED',
          status: OcrStatus.LINKED,
        },
      });

      this.logger.log(
        `Outbound auto-linked OCR ${ocrData.id} → SO ${so.soNumber}, Shipment ${shipmentNumber}, Document ${documentCode}`,
      );
    });
  }

  // ─── Utility ────────────────────────────────────────────────────
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]/gi, '')
      .trim();
  }
}
