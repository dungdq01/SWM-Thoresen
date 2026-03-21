import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import Decimal from 'decimal.js';
import {
  WeighDirection,
  LogMode,
  WeighEventProcessingStatus,
  ChainWarning,
  CallbackStatus,
} from '../domain/integration.enums';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';

// ── Constants ──────────────────────────────────────────────────────────────────
const CHAIN_TOLERANCE_KG = 50; // ±50kg tolerance for cascading chain validation

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface CascadingWeighInput {
  weighbridgeEventId: string;
  scaleDeviceId?: string;
  vehicleNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
  documentNumber: string;        // receipt_number or order_number
  itemCode: string;              // SKU code
  warehouseCode?: string;
  ownerCode?: string;
  logMode?: LogMode;             // CHECK_IN or WEIGHING (default)
  scaleTicketId?: string;        // links CHECK_IN to subsequent WEIGHING logs
  previousLogId?: string;        // explicit chain link (optional — auto-resolved if omitted)
  correlationId: string;
  sourceChannel: string;
  eventTime: string;
  isManualEntry?: boolean;
  manualReasonCode?: string;
  approvedBy?: string;
  rawPayload?: Record<string, unknown>;
  notes?: string;
}

export interface CascadingWeighResult {
  id: string;
  weighbridgeEventId: string;
  direction: WeighDirection;
  logMode: LogMode;
  netWeightKg: number;
  qtyUpdated: number | null;
  weightOnly: boolean;
  chainWarning: string | null;
  documentLineId: string | null;
  processingStatus: string;
}

@Injectable()
export class WeighbridgeCascadingService {
  private readonly logger = new Logger(WeighbridgeCascadingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point: Per-SKU cascading weighbridge log
   * Implements spec: 03-weighbridge-flow.md
   *
   * Flow:
   * 1. Basic validation (gross > 0, tare > 0, gross != tare)
   * 2. Auto-detect direction (gross > tare → INBOUND, gross < tare → OUTBOUND)
   * 3. Resolve business keys (document, line, warehouse, owner)
   * 4. Chain validation (if previousLogId or existing logs for same document)
   * 5. Compute net weight
   * 6. UOM-based update: check item_group.weighbridge_qty_uom vs line.uom
   * 7. Update document line (received_qty or shipped_qty + net_weight_kg)
   * 8. Create immutable log
   */
  async processWeighEvent(input: CascadingWeighInput, createdBy: string): Promise<CascadingWeighResult> {
    const logMode = input.logMode || LogMode.WEIGHING;

    // ── CHECK_IN mode: early return ──
    if (logMode === LogMode.CHECK_IN) {
      return this.processCheckIn(input, createdBy);
    }

    // ── WEIGHING mode: full pipeline ──
    return this.processWeighing(input, createdBy);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHECK_IN MODE — gross weight only, no SKU required
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async processCheckIn(input: CascadingWeighInput, createdBy: string): Promise<CascadingWeighResult> {
    // Validation: CHECK_IN only requires gross weight
    if (!input.grossWeightKg || input.grossWeightKg <= 0) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        'CHECK_IN mode yêu cầu gross_weight_kg > 0',
      );
    }

    // Idempotency
    const existing = await this.prisma.m8WeighbridgeLog.findUnique({
      where: { weighbridgeEventId: input.weighbridgeEventId },
    });
    if (existing) {
      return {
        id: existing.id,
        weighbridgeEventId: existing.weighbridgeEventId,
        direction: WeighDirection.INBOUND,
        logMode: LogMode.CHECK_IN,
        netWeightKg: 0,
        qtyUpdated: null,
        weightOnly: true,
        chainWarning: null,
        documentLineId: null,
        processingStatus: 'DUPLICATE',
      };
    }

    const scaleTicketId = input.scaleTicketId || input.weighbridgeEventId;

    const log = await this.prisma.$transaction(async (tx) => {
      const createdLog = await tx.m8WeighbridgeLog.create({
        data: {
          weighbridgeEventId: input.weighbridgeEventId,
          vehicleNumber: input.vehicleNumber,
          weighingType: 'GROSS_LINE',
          weighingSequence: 0,
          grossWeightKg: input.grossWeightKg,
          // tare, net intentionally NULL for CHECK_IN
          logMode: 'CHECK_IN',
          scaleTicketId,
          direction: null, // direction not known yet at CHECK_IN
          documentNumber: input.documentNumber || null,
          rawPayload: input.rawPayload as any,
          isStableWeight: true,
          isDuplicateSignal: false,
          isManualEntry: input.isManualEntry || false,
          manualReasonCode: input.manualReasonCode,
          approvedBy: input.approvedBy,
          scaleDeviceId: input.scaleDeviceId,
          warehouseId: null,
          ownerId: null,
          externalId: input.weighbridgeEventId,
          correlationId: input.correlationId,
          sourceChannel: input.sourceChannel,
          weighingTimestamp: new Date(input.eventTime),
          createdBy,
          weightOnly: true,
          notes: input.notes,
          grossWeightAt: new Date(input.eventTime),
        },
      });

      await tx.m8WeighbridgeEventState.create({
        data: {
          weighbridgeLogId: createdLog.id,
          processingStatus: 'RECEIVED',
          callbackStatus: 'PENDING',
        },
      });

      return createdLog;
    });

    this.logger.log(`CHECK_IN created: ${log.id}, vehicle: ${input.vehicleNumber}, gross: ${input.grossWeightKg}kg, ticket: ${scaleTicketId}`);

    return {
      id: log.id,
      weighbridgeEventId: input.weighbridgeEventId,
      direction: WeighDirection.INBOUND,
      logMode: LogMode.CHECK_IN,
      netWeightKg: 0,
      qtyUpdated: null,
      weightOnly: true,
      chainWarning: null,
      documentLineId: null,
      processingStatus: WeighEventProcessingStatus.RECEIVED,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WEIGHING MODE — full per-SKU cascading pipeline
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async processWeighing(input: CascadingWeighInput, createdBy: string): Promise<CascadingWeighResult> {
    // ── Step 1: Basic validation ──
    this.validateWeights(input.grossWeightKg, input.tareWeightKg);

    // ── Step 2: Idempotency ──
    const existing = await this.prisma.m8WeighbridgeLog.findUnique({
      where: { weighbridgeEventId: input.weighbridgeEventId },
    });
    if (existing) {
      return {
        id: existing.id,
        weighbridgeEventId: existing.weighbridgeEventId,
        direction: (existing.direction as WeighDirection) || WeighDirection.INBOUND,
        logMode: LogMode.WEIGHING,
        netWeightKg: existing.netWeightKg ? Number(existing.netWeightKg) : 0,
        qtyUpdated: existing.qtyUpdated ? Number(existing.qtyUpdated) : null,
        weightOnly: existing.weightOnly,
        chainWarning: existing.chainWarning,
        documentLineId: existing.receiptLineId || existing.shipmentLineId || null,
        processingStatus: 'DUPLICATE',
      };
    }

    // ── Step 3: Auto-detect direction ──
    const direction = this.detectDirection(input.grossWeightKg, input.tareWeightKg);

    // ── Step 4: Compute net weight ──
    const netWeightKg = Math.abs(
      new Decimal(input.grossWeightKg).minus(input.tareWeightKg).toNumber(),
    );

    // ── Step 5: Resolve document + line ──
    const resolution = await this.resolveDocumentLine(
      direction,
      input.documentNumber,
      input.itemCode,
      input.warehouseCode,
      input.ownerCode,
    );

    // ── Step 6: Chain validation ──
    const chainWarning = await this.validateChain(
      input.previousLogId,
      input.grossWeightKg,
      resolution.documentId,
      direction,
    );

    // ── Step 7: Determine weighing sequence ──
    const sequence = await this.getNextSequence(resolution.documentId, direction);

    // ── Step 8: UOM-based qty update logic ──
    const uomResult = await this.resolveUomUpdate(
      resolution.lineId,
      resolution.lineUomId,
      resolution.itemId,
      netWeightKg,
      direction,
    );

    // ── Step 9: Atomic transaction — create log + update document line ──
    const result = await this.prisma.$transaction(async (tx) => {
      // 9a. Create immutable weighbridge log
      const log = await tx.m8WeighbridgeLog.create({
        data: {
          weighbridgeEventId: input.weighbridgeEventId,
          receiptId: direction === WeighDirection.INBOUND ? resolution.documentId : null,
          shipmentId: direction === WeighDirection.OUTBOUND ? resolution.documentId : null,
          receiptLineId: direction === WeighDirection.INBOUND ? resolution.lineId : null,
          shipmentLineId: direction === WeighDirection.OUTBOUND ? resolution.lineId : null,
          vehicleNumber: input.vehicleNumber,
          weighingType: 'GROSS_LINE',
          weighingSequence: sequence,
          grossWeightKg: input.grossWeightKg,
          tareWeightKg: input.tareWeightKg,
          netWeightKg,
          logMode: 'WEIGHING',
          direction: direction as any,
          documentNumber: input.documentNumber,
          previousLogId: input.previousLogId || null,
          scaleTicketId: input.scaleTicketId || null,
          chainWarning: chainWarning || null,
          qtyUpdated: uomResult.qtyUpdated,
          weightOnly: uomResult.weightOnly,
          rawPayload: input.rawPayload as any,
          isStableWeight: true,
          isDuplicateSignal: false,
          isManualEntry: input.isManualEntry || false,
          manualReasonCode: input.manualReasonCode,
          approvedBy: input.approvedBy,
          scaleDeviceId: input.scaleDeviceId,
          warehouseId: resolution.warehouseId || null,
          ownerId: resolution.ownerId || null,
          itemCode: input.itemCode,
          externalId: input.weighbridgeEventId,
          correlationId: input.correlationId,
          sourceChannel: input.sourceChannel,
          weighingTimestamp: new Date(input.eventTime),
          createdBy,
          notes: input.notes,
          grossWeightAt: new Date(input.eventTime),
          tareWeightAt: new Date(input.eventTime),
        },
      });

      // 9b. Create event state
      await tx.m8WeighbridgeEventState.create({
        data: {
          weighbridgeLogId: log.id,
          processingStatus: 'COMPLETED',
          callbackStatus: 'PENDING',
        },
      });

      // 9c. Update document line with qty and/or weight
      if (direction === WeighDirection.INBOUND && resolution.lineId) {
        const updateData: any = {
          netWeightKg: { increment: netWeightKg },
        };
        if (!uomResult.weightOnly && uomResult.qtyUpdated !== null) {
          updateData.receivedQty = { increment: uomResult.qtyUpdated };
        }
        await tx.receiptLine.update({
          where: { id: resolution.lineId },
          data: updateData,
        });
      }

      if (direction === WeighDirection.OUTBOUND && resolution.lineId) {
        const updateData: any = {
          netWeightKg: { increment: netWeightKg },
        };
        if (!uomResult.weightOnly && uomResult.qtyUpdated !== null) {
          updateData.shippedQty = { increment: uomResult.qtyUpdated };
        }
        await tx.shipmentLine.update({
          where: { id: resolution.lineId },
          data: updateData,
        });
      }

      return log;
    });

    this.logger.log(
      `WEIGHING completed: ${result.id}, dir=${direction}, doc=${input.documentNumber}, sku=${input.itemCode}, ` +
      `net=${netWeightKg}kg, qty=${uomResult.qtyUpdated ?? 'N/A'}, weightOnly=${uomResult.weightOnly}` +
      (chainWarning ? `, chain_warn=${chainWarning}` : ''),
    );

    return {
      id: result.id,
      weighbridgeEventId: input.weighbridgeEventId,
      direction,
      logMode: LogMode.WEIGHING,
      netWeightKg,
      qtyUpdated: uomResult.qtyUpdated,
      weightOnly: uomResult.weightOnly,
      chainWarning,
      documentLineId: resolution.lineId,
      processingStatus: WeighEventProcessingStatus.COMPLETED,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private validateWeights(gross: number, tare: number) {
    if (!gross || gross <= 0) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        'gross_weight_kg phải > 0',
      );
    }
    if (!tare || tare <= 0) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        'tare_weight_kg phải > 0',
      );
    }
    if (gross === tare) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        'gross_weight_kg và tare_weight_kg không được bằng nhau',
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTO-DETECT DIRECTION
  // Spec: gross > tare → INBOUND (xe đầy vào, xe trống ra)
  //       gross < tare → OUTBOUND (xe trống vào, xe đầy ra)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private detectDirection(gross: number, tare: number): WeighDirection {
    return gross > tare ? WeighDirection.INBOUND : WeighDirection.OUTBOUND;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESOLVE DOCUMENT + LINE
  // Spec: document_number + item_code → find receipt_line or shipment_line
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async resolveDocumentLine(
    direction: WeighDirection,
    documentNumber: string,
    itemCode: string,
    warehouseCode?: string,
    ownerCode?: string,
  ): Promise<{
    documentId: string;
    lineId: string | null;
    lineUomId: string | null;
    itemId: string | null;
    warehouseId: string | null;
    ownerId: string | null;
  }> {
    if (direction === WeighDirection.INBOUND) {
      return this.resolveInboundLine(documentNumber, itemCode, warehouseCode, ownerCode);
    } else {
      return this.resolveOutboundLine(documentNumber, itemCode, warehouseCode, ownerCode);
    }
  }

  private async resolveInboundLine(
    documentNumber: string,
    itemCode: string,
    warehouseCode?: string,
    ownerCode?: string,
  ) {
    // Find receipt by receipt_number
    const receipt = await this.prisma.receiptHeader.findFirst({
      where: { receiptNumber: documentNumber },
      include: {
        lines: {
          include: { item: true, uom: true },
        },
      },
    });

    if (!receipt) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Không tìm thấy phiếu nhập có số: ${documentNumber}`,
      );
    }

    // Find matching line by itemCode
    const line = receipt.lines.find((l) => l.item.itemCode === itemCode);

    return {
      documentId: receipt.id,
      lineId: line?.id || null,
      lineUomId: line?.uomId || null,
      itemId: line?.itemId || null,
      warehouseId: receipt.warehouseId || null,
      ownerId: receipt.ownerId || null,
    };
  }

  private async resolveOutboundLine(
    documentNumber: string,
    itemCode: string,
    warehouseCode?: string,
    ownerCode?: string,
  ) {
    // Find shipment by shipment_number
    const shipment = await this.prisma.shipmentHeader.findFirst({
      where: { shipmentNumber: documentNumber },
      include: {
        lines: {
          include: { item: true, uom: true },
        },
      },
    });

    if (!shipment) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Không tìm thấy phiếu xuất có số: ${documentNumber}`,
      );
    }

    const line = shipment.lines.find((l) => l.item.itemCode === itemCode);

    return {
      documentId: shipment.id,
      lineId: line?.id || null,
      lineUomId: line?.uomId || null,
      itemId: line?.itemId || null,
      warehouseId: shipment.warehouseId || null,
      ownerId: shipment.ownerId || null,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CASCADING CHAIN VALIDATION
  // Spec: log[n].gross ≈ log[n-1].tare (±50kg)
  // Non-blocking: issues warning, does NOT reject
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async validateChain(
    previousLogId: string | undefined,
    currentGross: number,
    documentId: string,
    direction: WeighDirection,
  ): Promise<string | null> {
    // If explicit previousLogId provided, validate against it
    if (previousLogId) {
      const prevLog = await this.prisma.m8WeighbridgeLog.findUnique({
        where: { id: previousLogId },
      });
      if (prevLog?.tareWeightKg) {
        const prevTare = Number(prevLog.tareWeightKg);
        const diff = Math.abs(currentGross - prevTare);
        if (diff > CHAIN_TOLERANCE_KG) {
          this.logger.warn(
            `CHAIN_WEIGHT_MISMATCH: currentGross=${currentGross}, prevTare=${prevTare}, diff=${diff}kg > ${CHAIN_TOLERANCE_KG}kg`,
          );
          return ChainWarning.CHAIN_WEIGHT_MISMATCH;
        }
      }
      return null;
    }

    // Auto-resolve: find latest COMPLETED log for same document
    const whereClause = direction === WeighDirection.INBOUND
      ? { receiptId: documentId }
      : { shipmentId: documentId };

    const lastLog = await this.prisma.m8WeighbridgeLog.findFirst({
      where: {
        ...whereClause,
        logMode: 'WEIGHING',
        netWeightKg: { not: null },
      },
      orderBy: { weighingSequence: 'desc' },
    });

    if (lastLog?.tareWeightKg) {
      const prevTare = Number(lastLog.tareWeightKg);
      const diff = Math.abs(currentGross - prevTare);
      if (diff > CHAIN_TOLERANCE_KG) {
        this.logger.warn(
          `CHAIN_WEIGHT_MISMATCH (auto): currentGross=${currentGross}, prevTare=${prevTare}, diff=${diff}kg`,
        );
        return ChainWarning.CHAIN_WEIGHT_MISMATCH;
      }
    }

    return null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEQUENCE NUMBER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async getNextSequence(documentId: string, direction: WeighDirection): Promise<number> {
    const whereClause = direction === WeighDirection.INBOUND
      ? { receiptId: documentId }
      : { shipmentId: documentId };

    const count = await this.prisma.m8WeighbridgeLog.count({
      where: { ...whereClause, logMode: 'WEIGHING' },
    });
    return count + 1;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UOM-BASED QTY UPDATE LOGIC
  // Spec: IF line.uom = item_group.weighbridge_qty_uom
  //         → update BOTH qty AND net_weight_kg
  //       ELSE
  //         → update net_weight_kg ONLY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async resolveUomUpdate(
    lineId: string | null,
    lineUomId: string | null,
    itemId: string | null,
    netWeightKg: number,
    direction: WeighDirection,
  ): Promise<{ qtyUpdated: number | null; weightOnly: boolean }> {
    if (!lineId || !lineUomId || !itemId) {
      // No line found → weight only (log will still be created)
      return { qtyUpdated: null, weightOnly: true };
    }

    // Get item → itemGroup → weighbridgeQtyUom
    const item = await this.prisma.mdItem.findUnique({
      where: { id: itemId },
      include: {
        itemGroup: {
          include: { weighbridgeQtyUom: true },
        },
      },
    });

    if (!item?.itemGroup?.weighbridgeQtyUomId) {
      // No item group or no weighbridge UOM config → weight only
      this.logger.debug(`Item ${item?.itemCode}: no itemGroup.weighbridgeQtyUom → weight only`);
      return { qtyUpdated: null, weightOnly: true };
    }

    const weighbridgeUomId = item.itemGroup.weighbridgeQtyUomId;

    // Compare: line.uom == item_group.weighbridge_qty_uom?
    if (lineUomId === weighbridgeUomId) {
      // UOM matches → update qty = net_weight_kg (same unit)
      this.logger.debug(
        `Item ${item.itemCode}: lineUom matches weighbridgeQtyUom → update qty + weight`,
      );
      return { qtyUpdated: netWeightKg, weightOnly: false };
    }

    // UOM doesn't match → weight only
    this.logger.debug(
      `Item ${item.itemCode}: lineUom (${lineUomId}) != weighbridgeQtyUom (${weighbridgeUomId}) → weight only`,
    );
    return { qtyUpdated: null, weightOnly: true };
  }
}
