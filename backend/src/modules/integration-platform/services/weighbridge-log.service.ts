import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WeighbridgeLogRepository, WeighLogQueryParams } from '../repositories/weighbridge-log.repository';
import { WeighbridgeEventStateRepository } from '../repositories/weighbridge-event-state.repository';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';
import { WeighEventProcessingStatus } from '../domain/integration.enums';
import { PurchaseOrderService } from '../../inbound/services/purchase-order.service';
// TODO: Re-enable when bridge adapters are finalized
// import { InboundBridgeAdapter } from '../adapters/inbound-bridge.adapter_draft';
// import { OutboundBridgeAdapter } from '../adapters/outbound-bridge.adapter_draft';
// import { FEATURES } from '../config/feature-flags_draft';
const FEATURES = { M8_M4_AUTO_SYNC: false, M8_M5_AUTO_SYNC: false, M8_M4_VERBOSE_LOGGING: false, M8_M5_VERBOSE_LOGGING: false };

@Injectable()
export class WeighbridgeLogService {
  private readonly logger = new Logger(WeighbridgeLogService.name);

  constructor(
    private readonly logRepo: WeighbridgeLogRepository,
    private readonly eventStateRepo: WeighbridgeEventStateRepository,
    private readonly prisma: PrismaService,
    private readonly purchaseOrderService: PurchaseOrderService,
  ) {}

  async getLogs(params: {
    scaleDeviceId?: string;
    vehicleNumber?: string;
    referenceType?: string;
    referenceId?: string;
    weighingType?: string;
    dateFrom?: string;
    dateTo?: string;
    isManualEntry?: boolean;
    sourceChannel?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams: WeighLogQueryParams = {
      scaleDeviceId: params.scaleDeviceId,
      vehicleNumber: params.vehicleNumber,
      weighingType: params.weighingType,
      isManualEntry: params.isManualEntry,
      sourceChannel: params.sourceChannel,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
    };

    if (params.referenceType === 'RECEIPT' && params.referenceId) {
      queryParams.receiptId = params.referenceId;
    } else if (params.referenceType === 'SHIPMENT' && params.referenceId) {
      queryParams.shipmentId = params.referenceId;
    }

    if (params.dateFrom) queryParams.dateFrom = new Date(params.dateFrom);
    if (params.dateTo) queryParams.dateTo = new Date(params.dateTo);

    const result = await this.logRepo.findMany(queryParams);

    // Lookup warehouse info for devices AND manual entries
    const warehouseIds = [...new Set(result.data.flatMap((log: any) => [log.warehouseId, log.device?.warehouseId]).filter(Boolean))];
    const warehouses = warehouseIds.length > 0
      ? await this.prisma.mdWarehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, warehouseCode: true, warehouseName: true },
        })
      : [];
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    // Lookup receipt info
    const receiptIds = [...new Set(result.data.map((log: any) => log.receiptId).filter(Boolean))];
    const receipts = receiptIds.length > 0
      ? await this.prisma.receiptHeader.findMany({
          where: { id: { in: receiptIds } },
          select: {
            id: true,
            receiptNumber: true,
            asnId: true,
            owner: { select: { id: true, ownerCode: true, ownerName: true } },
            lines: { select: { id: true, item: { select: { itemCode: true, itemName: true } }, expectedQty: true, receivedQty: true, status: true, uom: { select: { uomCode: true } } } },
          },
        })
      : [];
    const receiptMap = new Map(receipts.map((r) => [r.id, r]));

    // Lookup shipment info
    const shipmentIds = [...new Set(result.data.map((log: any) => log.shipmentId).filter(Boolean))];
    const shipments = shipmentIds.length > 0
      ? await this.prisma.shipmentHeader.findMany({
          where: { id: { in: shipmentIds } },
          select: {
            id: true,
            shipmentNumber: true,
            owner: { select: { id: true, ownerCode: true, ownerName: true } },
            lines: { select: { id: true, lineNumber: true, item: { select: { itemCode: true, itemName: true } }, expectedQtyKg: true, allocatedQty: true, shippedQty: true, netWeightKg: true, lineStatus: true, uom: { select: { uomCode: true } } }, orderBy: { lineNumber: 'asc' } },
          },
        })
      : [];
    const shipmentMap = new Map(shipments.map((s) => [s.id, s]));

    // Lookup owner info for manual entries that store ownerId directly
    const manualOwnerIds = [...new Set(result.data.map((log: any) => log.ownerId).filter(Boolean))];
    const manualOwners = manualOwnerIds.length > 0
      ? await this.prisma.mdOwner.findMany({
          where: { id: { in: manualOwnerIds } },
          select: { id: true, ownerCode: true, ownerName: true },
        })
      : [];
    const ownerMap = new Map(manualOwners.map((o) => [o.id, o]));

    return {
      data: result.data.map((log: any) => this.mapLogToResponseWithRelations(log, warehouseMap, receiptMap, shipmentMap, ownerMap)),
      pagination: {
        total: result.total,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(result.total / (params.limit || 20)),
      },
    };
  }

  async getLogById(id: string) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    return this.mapLogToDetailResponse(log);
  }

  async confirmLog(id: string, context: { userId?: string } = {}) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    if (log.eventState?.processingStatus !== WeighEventProcessingStatus.RECEIVED) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        `Cannot confirm weigh log with status ${log.eventState?.processingStatus}`,
      );
    }
    await this.eventStateRepo.updateByLogId(id, {
      processingStatus: WeighEventProcessingStatus.VALIDATED as any,
    });

    // Update receipt status: AWAITING_WEIGHING → WEIGHING_1 when weigh ticket confirmed
    if (log.receiptId) {
      try {
        const receipt = await this.prisma.receiptHeader.findUnique({ where: { id: log.receiptId }, select: { status: true } });
        if (receipt && receipt.status === 'AWAITING_WEIGHING') {
          await this.prisma.receiptHeader.update({
            where: { id: log.receiptId },
            data: { status: 'WEIGHING_1' },
          });
          await this.prisma.receiptStatusHistory.create({
            data: {
              receiptHeaderId: log.receiptId,
              fromStatus: 'AWAITING_WEIGHING',
              toStatus: 'WEIGHING_1',
              transitionCode: 'WEIGH_TICKET_CONFIRMED',
              triggeredBy: context.userId || undefined,
              correlationId: log.receiptId,
              occurredAt: new Date(),
            },
          });
          this.logger.log(`Receipt ${log.receiptId} status: AWAITING_WEIGHING → WEIGHING_1`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to update receipt status on confirm: ${e.message}`);
      }
    }

    return { id, processingStatus: WeighEventProcessingStatus.VALIDATED };
  }

  async rejectLog(id: string, reason?: string) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    if (log.eventState?.processingStatus !== WeighEventProcessingStatus.RECEIVED) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        `Cannot reject weigh log with status ${log.eventState?.processingStatus}`,
      );
    }
    await this.eventStateRepo.updateByLogId(id, {
      processingStatus: WeighEventProcessingStatus.REJECTED as any,
      callbackError: reason || null,
    });

    // Revert receipt status: AWAITING_WEIGHING → CONFIRMED when weigh ticket rejected/cancelled
    if (log.receiptId) {
      try {
        const receipt = await this.prisma.receiptHeader.findUnique({ where: { id: log.receiptId }, select: { status: true } });
        if (receipt && receipt.status === 'AWAITING_WEIGHING') {
          await this.prisma.receiptHeader.update({
            where: { id: log.receiptId },
            data: { status: 'CONFIRMED' },
          });
          await this.prisma.receiptStatusHistory.create({
            data: {
              receiptHeaderId: log.receiptId,
              fromStatus: 'AWAITING_WEIGHING',
              toStatus: 'CONFIRMED',
              transitionCode: 'WEIGH_TICKET_CANCELLED',
              triggeredBy: undefined,
              correlationId: log.receiptId,
              occurredAt: new Date(),
            },
          });
          this.logger.log(`Receipt ${log.receiptId} status: AWAITING_WEIGHING → CONFIRMED (weigh ticket rejected)`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to revert receipt status on weigh ticket rejection: ${e.message}`);
      }
    }

    return { id, processingStatus: WeighEventProcessingStatus.REJECTED };
  }

  async softDeleteLog(id: string) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    if (log.eventState?.processingStatus !== WeighEventProcessingStatus.RECEIVED) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        `Chỉ có thể xóa phiếu cân ở trạng thái Tạo mới`,
      );
    }
    // Soft delete: set status to REJECTED with reason
    await this.eventStateRepo.updateByLogId(id, {
      processingStatus: WeighEventProcessingStatus.REJECTED as any,
      callbackError: 'SOFT_DELETED',
    });

    // Revert receipt status if needed
    if (log.receiptId) {
      try {
        const receipt = await this.prisma.receiptHeader.findUnique({ where: { id: log.receiptId }, select: { status: true } });
        if (receipt && receipt.status === 'AWAITING_WEIGHING') {
          await this.prisma.receiptHeader.update({
            where: { id: log.receiptId },
            data: { status: 'CONFIRMED' },
          });
          this.logger.log(`Receipt ${log.receiptId} status: AWAITING_WEIGHING → CONFIRMED (weigh ticket deleted)`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to revert receipt on delete: ${e.message}`);
      }
    }

    return { id, deleted: true };
  }

  async recordWeight(id: string, data: { weightKg: number }) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    const status = log.eventState?.processingStatus as string | undefined;
    if (status !== WeighEventProcessingStatus.VALIDATED && status !== WeighEventProcessingStatus.WEIGHING) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.INVALID_WEIGHING_TYPE,
        `Cannot record weight for log with status ${status}`,
      );
    }

    const now = new Date();

    this.logger.log(`recordWeight id=${id} grossWeightKg=${log.grossWeightKg} tareWeightKg=${log.tareWeightKg}`);

    // ─── INBOUND MULTI-ITEM WEIGHING (N+1 lần cân) ───
    if (log.weighingType === 'WEIGH_IN' && log.receiptId) {
      return this.recordInboundWeight(id, log, data.weightKg, now);
    }

    // ─── OUTBOUND MULTI-ITEM WEIGHING (N+1 lần cân) ───
    if (log.weighingType === 'WEIGH_OUT' && log.shipmentId) {
      return this.recordOutboundWeight(id, log, data.weightKg, now);
    }

    throw new WeighbridgeError(IntegrationErrorCodes.INVALID_WEIGHING_TYPE, 'Invalid weighing type or missing reference');
  }

  /**
   * Multi-item outbound weighing: N items → N+1 lần cân
   * Lần 1: Tare (xe rỗng)
   * Lần 2+: Gross sau khi xếp hàng, net = lần này − lần trước
   */
  private async recordOutboundWeight(logId: string, log: any, weightKg: number, now: Date) {
    const shipmentId = log.shipmentId!;

    // Get existing weight records
    let existingRecords = await this.prisma.weighbridgeWeightRecord.findMany({
      where: { weighbridgeLogId: logId },
      orderBy: { sequence: 'asc' },
    });

    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id: shipmentId },
      include: {
        warehouse: { select: { warehouseCode: true } },
        owner: { select: { ownerCode: true } },
        lines: {
          where: { lineStatus: { not: 'CANCELLED' } },
          include: {
            item: { select: { itemCode: true } },
            uom: { select: { uomCode: true } },
            location: { select: { locationCode: true } },
          },
        },
      },
    }) as any;
    if (!shipment) throw new NotFoundException('Shipment not found');

    // Backward compat: nếu gross đã ghi (flow cũ) nhưng chưa có WeightRecord, tạo record lần 1
    if (existingRecords.length === 0 && log.grossWeightKg != null) {
      await this.prisma.weighbridgeWeightRecord.create({
        data: {
          weighbridgeLogId: logId,
          sequence: 1,
          weightKg: Number(log.grossWeightKg),
          recordedAt: log.grossWeightAt || now,
          isFinal: false,
        },
      });
      existingRecords = await this.prisma.weighbridgeWeightRecord.findMany({
        where: { weighbridgeLogId: logId },
        orderBy: { sequence: 'asc' },
      });
      this.logger.log(`Created retroactive weight record #1 from existing grossWeightKg=${log.grossWeightKg}`);
    }

    const nextSequence = existingRecords.length + 1;

    // ─── Lần 1: Tare (xe rỗng) ───
    if (existingRecords.length === 0) {
      await this.prisma.weighbridgeWeightRecord.create({
        data: {
          weighbridgeLogId: logId,
          sequence: 1,
          weightKg,
          recordedAt: now,
          isFinal: false,
        },
      });

      await this.logRepo.update(logId, { grossWeightKg: weightKg, grossWeightAt: now });
      await this.eventStateRepo.updateByLogId(logId, { processingStatus: WeighEventProcessingStatus.WEIGHING as any });

      // Shipment → LOADING (nếu chưa)
      const prevStatus = shipment.status;
      if (prevStatus === 'CONFIRMED') {
        await this.prisma.shipmentHeader.update({ where: { id: shipmentId }, data: { status: 'LOADING' } });
        await this.prisma.shipmentStatusHistory.create({
          data: {
            shipmentHeaderId: shipmentId,
            entityLevel: 'HEADER',
            fromStatus: prevStatus,
            toStatus: 'LOADING',
            triggerAction: 'WEIGH_OUT_TARE',
            correlationId: shipmentId,
          },
        });
      }

      this.logger.log(`Outbound weighing #1 (tare): ${weightKg} kg for shipment ${shipmentId}`);
      return { id: logId, sequence: 1, tareWeightKg: weightKg, processingStatus: WeighEventProcessingStatus.WEIGHING };
    }

    // ─── Lần 2+: Gross sau khi xếp hàng ───
    const previousRecord = existingRecords[existingRecords.length - 1];
    const previousWeight = Number(previousRecord.weightKg);

    // Validation: phải có ít nhất 1 line LOADING (xếp sau lần cân trước)
    const loadingLines = shipment.lines.filter((l: any) => l.lineStatus === 'LOADING');
    if (loadingLines.length === 0) {
      throw new BadRequestException('Chưa xếp mặt hàng nào. Vui lòng xếp ít nhất 1 mặt hàng trước khi cân tiếp.');
    }

    // Validation: xe nặng dần (outbound: xếp hàng lên nên trọng lượng tăng)
    if (weightKg <= previousWeight) {
      throw new BadRequestException(`Trọng lượng (${weightKg} kg) phải lớn hơn lần cân trước (${previousWeight} kg) vì đã xếp hàng.`);
    }

    const netWeight = weightKg - previousWeight;
    const loadedLineIds = loadingLines.map((l: any) => l.id);

    // Check if this is the final weighing (no PENDING lines left)
    const pendingLines = shipment.lines.filter((l: any) => l.lineStatus === 'PENDING');
    const isFinal = pendingLines.length === 0;

    // Create weight record
    await this.prisma.weighbridgeWeightRecord.create({
      data: {
        weighbridgeLogId: logId,
        sequence: nextSequence,
        weightKg,
        recordedAt: now,
        unloadedLineIds: loadedLineIds, // reuse field for loaded lines
        netWeightKg: netWeight,
        isFinal,
      },
    });

    // Distribute net weight among LOADING lines → SHIPPED + post inventory
    const lineNets: { line: any; lineNet: number }[] = [];
    if (loadingLines.length === 1) {
      lineNets.push({ line: loadingLines[0], lineNet: netWeight });
    } else {
      const totalExpected = loadingLines.reduce((s: number, l: any) => s + Number(l.expectedQtyKg), 0);
      for (const line of loadingLines) {
        const ratio = totalExpected > 0 ? Number(line.expectedQtyKg) / totalExpected : 1 / loadingLines.length;
        lineNets.push({ line, lineNet: Math.round(netWeight * ratio * 1000) / 1000 });
      }
    }

    // Update lines → LINE_SHIPPED
    for (const { line, lineNet } of lineNets) {
      await this.prisma.shipmentLine.update({
        where: { id: line.id },
        data: { lineStatus: 'LINE_SHIPPED', shippedQty: lineNet, netWeightKg: lineNet },
      });
    }

    // Post SHIP_CONFIRMED immediately for each line in this batch
    try {
      const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
      const postingEngine = new PostingEngineService(this.prisma);

      for (const { line, lineNet } of lineNets) {
        if (lineNet <= 0) continue;
        await postingEngine.postInventory({
          externalId: `SHP-${shipmentId}-${line.id}-${Date.now()}`,
          correlationId: `SHP-${shipment.shipmentNumber || shipmentId}`,
          eventCode: 'SHIP_CONFIRMED',
          refType: 'SHIPMENT',
          refId: shipmentId,
          refLineId: line.id,
          itemId: line.itemId,
          qty: String(lineNet),
          uomCode: (line as any).uom?.uomCode || 'KG',
          dimFrom: {
            warehouseCode: shipment.warehouse?.warehouseCode,
            locationCode: (line as any).location?.locationCode || undefined,
            ownerCode: shipment.owner?.ownerCode,
            statusCode: 'AVAILABLE',
          },
          sourceApp: 'SYSTEM',
          postedBy: undefined,
          weighbridgeTicketId: logId,
        });
        this.logger.log(`Posted SHIP_CONFIRMED for line ${line.id}, qty=${lineNet} kg`);
      }
    } catch (postErr: any) {
      this.logger.error(`Error posting inventory for shipment ${shipmentId}`, postErr);
    }

    this.logger.log(`Outbound weighing #${nextSequence}: ${weightKg} kg, net=${netWeight} kg for ${loadingLines.length} items`);

    // ─── If FINAL weighing: complete shipment ───
    if (isFinal) {
      const totalNet = weightKg - Number(existingRecords[0].weightKg);
      await this.logRepo.update(logId, { tareWeightKg: weightKg, tareWeightAt: now, netWeightKg: totalNet });
      await this.eventStateRepo.updateByLogId(logId, { processingStatus: WeighEventProcessingStatus.COMPLETED as any });

      await this.prisma.shipmentHeader.update({
        where: { id: shipmentId },
        data: { status: 'SHIPPED' },
      });
      await this.prisma.shipmentStatusHistory.create({
        data: {
          shipmentHeaderId: shipmentId,
          entityLevel: 'HEADER',
          fromStatus: 'LOADING',
          toStatus: 'SHIPPED',
          triggerAction: 'WEIGH_FINAL',
          correlationId: shipmentId,
        },
      });

      this.logger.log(`Shipment ${shipmentId} SHIPPED: total net=${totalNet} kg`);
      return { id: logId, sequence: nextSequence, isFinal: true, netWeightKg: netWeight, totalNetWeightKg: totalNet, processingStatus: WeighEventProcessingStatus.COMPLETED };
    }

    // ─── NOT final: keep LOADING ───
    return { id: logId, sequence: nextSequence, isFinal: false, netWeightKg: netWeight, processingStatus: WeighEventProcessingStatus.WEIGHING };
  }

  /**
   * Multi-item inbound weighing: N items → N+1 lần cân
   * Mỗi lần cân: net = lần trước − lần này, gán cho items đã dỡ giữa 2 lần cân
   */
  private async recordInboundWeight(logId: string, log: any, weightKg: number, now: Date) {
    const receiptId = log.receiptId!;

    // Get existing weight records
    let existingRecords = await this.prisma.weighbridgeWeightRecord.findMany({
      where: { weighbridgeLogId: logId },
      orderBy: { sequence: 'asc' },
    });

    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
      include: {
        warehouse: { select: { warehouseCode: true } },
        owner: { select: { ownerCode: true } },
        lines: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            item: { select: { itemCode: true } },
            uom: { select: { uomCode: true } },
            location: { select: { locationCode: true } },
          },
        },
      },
    }) as any;
    if (!receipt) throw new NotFoundException('Receipt not found');

    // Backward compat: nếu gross đã ghi (flow cũ) nhưng chưa có WeightRecord, tạo record lần 1
    if (existingRecords.length === 0 && log.grossWeightKg != null) {
      await this.prisma.weighbridgeWeightRecord.create({
        data: {
          weighbridgeLogId: logId,
          sequence: 1,
          weightKg: Number(log.grossWeightKg),
          recordedAt: log.grossWeightAt || now,
          isFinal: false,
        },
      });
      existingRecords = await this.prisma.weighbridgeWeightRecord.findMany({
        where: { weighbridgeLogId: logId },
        orderBy: { sequence: 'asc' },
      });
      this.logger.log(`Created retroactive weight record #1 from existing grossWeightKg=${log.grossWeightKg}`);
    }

    const nextSequence = existingRecords.length + 1;

    // ─── Lần 1: Gross (xe đầy hàng) ───
    if (existingRecords.length === 0) {
      await this.prisma.weighbridgeWeightRecord.create({
        data: {
          weighbridgeLogId: logId,
          sequence: 1,
          weightKg,
          recordedAt: now,
          isFinal: false,
        },
      });

      await this.logRepo.update(logId, { grossWeightKg: weightKg, grossWeightAt: now });
      await this.eventStateRepo.updateByLogId(logId, { processingStatus: WeighEventProcessingStatus.WEIGHING as any });

      // Receipt → UNLOADING
      const prevStatus = receipt.status;
      if (prevStatus !== 'UNLOADING') {
        await this.prisma.receiptHeader.update({ where: { id: receiptId }, data: { status: 'UNLOADING' } });
        await this.prisma.receiptStatusHistory.create({
          data: { receiptHeaderId: receiptId, fromStatus: prevStatus, toStatus: 'UNLOADING', transitionCode: 'WEIGH_IN_GROSS', triggeredBy: undefined, correlationId: receiptId, occurredAt: now },
        });
      }

      this.logger.log(`Inbound weighing #1 (gross): ${weightKg} kg for receipt ${receiptId}`);
      return { id: logId, sequence: 1, grossWeightKg: weightKg, processingStatus: WeighEventProcessingStatus.WEIGHING };
    }

    // ─── Lần 2+: Intermediate hoặc Tare ───
    const previousRecord = existingRecords[existingRecords.length - 1];
    const previousWeight = Number(previousRecord.weightKg);

    // Validation: phải có ít nhất 1 line UNLOADED (dỡ sau lần cân trước)
    const unloadedLines = receipt.lines.filter((l: any) => l.status === 'UNLOADED');
    if (unloadedLines.length === 0) {
      throw new BadRequestException('Chưa dỡ mặt hàng nào. Vui lòng dỡ ít nhất 1 mặt hàng trước khi cân tiếp.');
    }

    // Validation: xe nhẹ dần (inbound: dỡ hàng ra nên trọng lượng giảm)
    if (weightKg >= previousWeight) {
      throw new BadRequestException(`Trọng lượng (${weightKg} kg) phải nhỏ hơn lần cân trước (${previousWeight} kg) vì đã dỡ hàng.`);
    }

    const netWeight = previousWeight - weightKg;
    const unloadedLineIds = unloadedLines.map((l: any) => l.id);

    // Check if this is the final weighing (no OPEN lines left — all items are off the truck)
    const openLines = receipt.lines.filter((l: any) => l.status === 'OPEN');
    const isFinal = openLines.length === 0;

    // Create weight record
    await this.prisma.weighbridgeWeightRecord.create({
      data: {
        weighbridgeLogId: logId,
        sequence: nextSequence,
        weightKg,
        recordedAt: now,
        unloadedLineIds,
        netWeightKg: netWeight,
        isFinal,
      },
    });

    // Distribute net weight among UNLOADED lines → RECEIVED immediately + post inventory
    const lineNets: { line: any; lineNet: number }[] = [];
    if (unloadedLines.length === 1) {
      lineNets.push({ line: unloadedLines[0], lineNet: netWeight });
    } else {
      const totalExpected = unloadedLines.reduce((s: number, l: any) => s + Number(l.expectedQty), 0);
      for (const line of unloadedLines) {
        const ratio = totalExpected > 0 ? Number(line.expectedQty) / totalExpected : 1 / unloadedLines.length;
        lineNets.push({ line, lineNet: Math.round(netWeight * ratio * 1000) / 1000 });
      }
    }

    // Update lines → RECEIVED (skip WEIGHED, go straight to RECEIVED since inventory posted immediately)
    for (const { line, lineNet } of lineNets) {
      await this.prisma.receiptLine.update({
        where: { id: line.id },
        data: { status: 'RECEIVED', receivedQty: lineNet, netWeightKg: lineNet },
      });
    }

    // Post GOODS_RECEIVED immediately for each line in this batch
    try {
      const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
      const postingEngine = new PostingEngineService(this.prisma);

      for (const { line, lineNet } of lineNets) {
        if (lineNet <= 0) continue;
        await postingEngine.postInventory({
          externalId: `RCV-${receiptId}-${line.id}-${Date.now()}`,
          correlationId: `RCV-${receipt.receiptNumber || receiptId}`,
          eventCode: 'GOODS_RECEIVED',
          refType: 'RECEIPT',
          refId: receiptId,
          refLineId: line.id,
          itemId: line.itemId,
          qty: String(lineNet),
          uomCode: (line as any).uom?.uomCode || 'KG',
          dimTo: {
            warehouseCode: receipt.warehouse?.warehouseCode,
            locationCode: (line as any).location?.locationCode || undefined,
            ownerCode: receipt.owner?.ownerCode,
            statusCode: 'AVAILABLE',
          },
          sourceApp: 'SYSTEM',
          postedBy: undefined,
          weighbridgeTicketId: logId,
        });
        this.logger.log(`Posted GOODS_RECEIVED for line ${line.id}, qty=${lineNet} kg`);
      }
    } catch (postErr: any) {
      this.logger.error(`Error posting inventory for receipt ${receiptId}`, postErr);
    }

    // Recalculate PO line statuses + PO header status
    if (receipt.poId) {
      try {
        const poResult = await this.purchaseOrderService.recalculatePOStatus(receipt.poId);
        if (poResult.updated) {
          this.logger.log(
            `PO ${receipt.poId} recalculated: ${poResult.fromStatus}→${poResult.toStatus}, ` +
            `received ${poResult.totalReceivedQty}/${poResult.totalExpectedQty} KG`,
          );
        } else {
          this.logger.warn(`PO recalculation skipped: ${poResult.reason}`);
        }
      } catch (poErr: any) {
        this.logger.warn(`Failed to recalculate PO status: ${poErr.message}`);
      }
    }

    this.logger.log(`Inbound weighing #${nextSequence}: ${weightKg} kg, net=${netWeight} kg for ${unloadedLines.length} items`);

    // ─── If FINAL weighing: complete receipt ───
    if (isFinal) {
      const totalNet = Number(existingRecords[0].weightKg) - weightKg;
      await this.logRepo.update(logId, { tareWeightKg: weightKg, tareWeightAt: now, netWeightKg: totalNet });
      await this.eventStateRepo.updateByLogId(logId, { processingStatus: WeighEventProcessingStatus.COMPLETED as any });

      await this.prisma.receiptHeader.update({
        where: { id: receiptId },
        data: { grossWeightKg: Number(existingRecords[0].weightKg), tareWeightKg: weightKg, netWeightKg: totalNet, status: 'COMPLETED' },
      });
      await this.prisma.receiptStatusHistory.create({
        data: { receiptHeaderId: receiptId, fromStatus: 'UNLOADING', toStatus: 'COMPLETED', transitionCode: 'WEIGH_FINAL', triggeredBy: undefined, correlationId: receiptId, occurredAt: now },
      });

      this.logger.log(`Receipt ${receiptId} COMPLETED: total net=${totalNet} kg`);
      return { id: logId, sequence: nextSequence, isFinal: true, netWeightKg: netWeight, totalNetWeightKg: totalNet, processingStatus: WeighEventProcessingStatus.COMPLETED };
    }

    // ─── NOT final: keep UNLOADING ───
    return { id: logId, sequence: nextSequence, isFinal: false, netWeightKg: netWeight, processingStatus: WeighEventProcessingStatus.WEIGHING };
  }

  async updateLog(id: string, data: { notes?: string }) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    return this.logRepo.update(id, { notes: data.notes });
  }

  async getLogsByReference(referenceType: 'RECEIPT' | 'SHIPMENT', referenceId: string) {
    const logs = await this.logRepo.findByReference(referenceType, referenceId);
    return logs.map(this.mapLogToResponse);
  }

  async getLogsByCorrelationId(correlationId: string) {
    const logs = await this.logRepo.findByCorrelationId(correlationId);
    return logs.map(this.mapLogToResponse);
  }

  async getDeviceStats(scaleDeviceId: string, dateFrom: Date, dateTo: Date) {
    const count = await this.logRepo.countByDevice(scaleDeviceId, dateFrom, dateTo);
    const latencyStats = await this.logRepo.getLatencyStats(dateFrom, dateTo);

    return {
      scaleDeviceId,
      period: { from: dateFrom, to: dateTo },
      eventCount: count,
      latency: {
        avgMs: latencyStats._avg.latencyMs,
        minMs: latencyStats._min.latencyMs,
        maxMs: latencyStats._max.latencyMs,
      },
    };
  }

  private mapLogToResponse(log: any) {
    // Map to frontend expected format
    const referenceType = log.receiptId ? 'RECEIPT' : log.shipmentId ? 'SHIPMENT' : null;
    const referenceId = log.receiptId || log.shipmentId || null;
    
    return {
      id: log.id,
      weighbridgeEventId: log.weighbridgeEventId,
      vehicleNumber: log.vehicleNumber,
      weighingType: log.weighingType,
      weighingSequence: log.weighingSequence,
      grossWeightKg: log.grossWeightKg ? Number(log.grossWeightKg) : null,
      grossWeightAt: log.grossWeightAt || null,
      tareWeightKg: log.tareWeightKg ? Number(log.tareWeightKg) : null,
      tareWeightAt: log.tareWeightAt || null,
      netWeightKg: log.netWeightKg ? Number(log.netWeightKg) : null,
      // Frontend expected fields
      referenceType,
      referenceId,
      weightKg: log.netWeightKg ? Number(log.netWeightKg) : (log.grossWeightKg ? Number(log.grossWeightKg) : null),
      capturedAt: log.weighingTimestamp,
      isStableWeight: log.isStableWeight,
      isDuplicateSignal: log.isDuplicateSignal,
      isManualEntry: log.isManualEntry,
      manualReasonCode: log.manualReasonCode,
      scaleDeviceId: log.scaleDeviceId,
      sourceChannel: log.sourceChannel,
      weighingTimestamp: log.weighingTimestamp,
      createdAt: log.createdAt,
      processingStatus: log.eventState?.processingStatus,
      callbackStatus: log.eventState?.callbackStatus,
      // Multi-item: last weight from weight records (for display in modal)
      lastWeightKg: log.weightRecords?.length > 0
        ? Number(log.weightRecords[log.weightRecords.length - 1].weightKg)
        : (log.grossWeightKg ? Number(log.grossWeightKg) : null),
      weightRecordCount: log.weightRecords?.length || 0,
    };
  }

  private mapLogToResponseWithRelations(
    log: any,
    warehouseMap: Map<string, any>,
    receiptMap: Map<string, any>,
    shipmentMap: Map<string, any>,
    ownerMap: Map<string, any>,
  ) {
    const referenceType = log.receiptId ? 'RECEIPT' : log.shipmentId ? 'SHIPMENT' : null;
    const referenceId = log.receiptId || log.shipmentId || null;

    // Get warehouse from log directly (for manual entries) or from device
    const warehouseId = log.warehouseId || log.device?.warehouseId;
    const warehouse = warehouseId ? warehouseMap.get(warehouseId) : null;

    // Get receipt or shipment info
    const receipt = log.receiptId ? receiptMap.get(log.receiptId) : null;
    const shipment = log.shipmentId ? shipmentMap.get(log.shipmentId) : null;

    // Extract owner and item info - prioritize log fields for manual entries
    const owner = log.ownerId ? ownerMap.get(log.ownerId) : (receipt?.owner || shipment?.owner || null);
    const itemInfo = log.itemCode ? { itemCode: log.itemCode } : (receipt?.lines?.[0]?.item || shipment?.lines?.[0]?.item || null);
    const ticketNumber = receipt?.asnId || shipment?.shipmentNumber || null;
    const asnId = receipt?.asnId || null;

    return {
      id: log.id,
      weighbridgeEventId: log.weighbridgeEventId,
      vehicleNumber: log.vehicleNumber,
      weighingType: log.weighingType,
      weighingSequence: log.weighingSequence,
      grossWeightKg: log.grossWeightKg ? Number(log.grossWeightKg) : null,
      grossWeightAt: log.grossWeightAt || null,
      tareWeightKg: log.tareWeightKg ? Number(log.tareWeightKg) : null,
      tareWeightAt: log.tareWeightAt || null,
      netWeightKg: log.netWeightKg ? Number(log.netWeightKg) : null,
      referenceType,
      referenceId,
      weightKg: log.netWeightKg ? Number(log.netWeightKg) : (log.grossWeightKg ? Number(log.grossWeightKg) : null),
      capturedAt: log.weighingTimestamp,
      isStableWeight: log.isStableWeight,
      isDuplicateSignal: log.isDuplicateSignal,
      isManualEntry: log.isManualEntry,
      manualReasonCode: log.manualReasonCode,
      scaleDeviceId: log.scaleDeviceId,
      sourceChannel: log.sourceChannel,
      weighingTimestamp: log.weighingTimestamp,
      createdAt: log.createdAt,
      processingStatus: log.eventState?.processingStatus,
      callbackStatus: log.eventState?.callbackStatus,
      // New fields for refactored table
      warehouse: warehouse ? {
        id: warehouse.id,
        code: warehouse.warehouseCode,
        name: warehouse.warehouseName,
      } : null,
      owner: owner ? {
        id: owner.id,
        code: owner.ownerCode,
        name: owner.ownerName,
      } : null,
      ticketNumber,
      itemCode: log.itemCode || (receipt?.lines?.length > 0
        ? receipt.lines.map((l: any) => l.item?.itemCode).filter(Boolean).join(', ')
        : shipment?.lines?.length > 0
          ? shipment.lines.map((l: any) => l.item?.itemCode).filter(Boolean).join(', ')
          : null),
      itemName: itemInfo?.itemName || null,
      asnId,
      notes: log.notes || null,
      receipt: receipt ? {
        id: receipt.id,
        lines: (receipt.lines || []).map((l: any) => ({
          id: l.id,
          item: l.item,
          expectedQty: l.expectedQty ? Number(l.expectedQty) : null,
          receivedQty: l.receivedQty ? Number(l.receivedQty) : null,
          status: l.status,
          uomCode: l.uom?.uomCode || null,
        })),
      } : null,
      shipment: shipment ? {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        lines: (shipment.lines || []).map((l: any) => ({
          id: l.id,
          lineNumber: l.lineNumber || 0,
          item: l.item,
          itemName: l.item?.itemName || null,
          itemCode: l.item?.itemCode || null,
          expectedQty: l.expectedQtyKg ? Number(l.expectedQtyKg) : null,
          allocatedQty: l.allocatedQty ? Number(l.allocatedQty) : null,
          shippedQty: l.shippedQty ? Number(l.shippedQty) : null,
          netWeightKg: l.netWeightKg ? Number(l.netWeightKg) : null,
          lineStatus: l.lineStatus || null,
          uomCode: l.uom?.uomCode || null,
        })),
      } : null,
      // Multi-item weighing: TL lần cân gần nhất (để modal cân hiển thị đúng)
      lastWeightKg: log.weightRecords?.length > 0
        ? Number(log.weightRecords[log.weightRecords.length - 1].weightKg)
        : (log.grossWeightKg ? Number(log.grossWeightKg) : null),
      weightRecordCount: log.weightRecords?.length || 0,
    };
  }

  private async mapLogToDetailResponse(log: any) {
    // Fetch receipt with all lines for detail view
    let receipt = null;
    if (log.receiptId) {
      const r = await this.prisma.receiptHeader.findUnique({
        where: { id: log.receiptId },
        select: {
          id: true, asnId: true,
          lines: { select: { id: true, item: { select: { itemCode: true, itemName: true } }, expectedQty: true, receivedQty: true, status: true, uom: { select: { uomCode: true } } } },
        },
      });
      if (r) {
        receipt = {
          id: r.id,
          lines: r.lines.map((l: any) => ({
            id: l.id, item: l.item,
            expectedQty: l.expectedQty ? Number(l.expectedQty) : null,
            receivedQty: l.receivedQty ? Number(l.receivedQty) : null,
            status: l.status, uomCode: l.uom?.uomCode || null,
          })),
        };
      }
    }

    return {
      ...this.mapLogToResponse(log),
      receipt,
      rawPayload: log.rawPayload,
      rawWeightValue: log.rawWeightValue,
      duplicateOfEventId: log.duplicateOfEventId,
      approvedBy: log.approvedBy,
      photoAlprPath: log.photoAlprPath,
      photoCargoPath: log.photoCargoPath,
      latencyMs: log.latencyMs,
      externalId: log.externalId,
      correlationId: log.correlationId,
      createdBy: log.createdBy,
      receiptId: log.receiptId,
      shipmentId: log.shipmentId,
      eventState: log.eventState ? {
        processingStatus: log.eventState.processingStatus,
        linkedModule: log.eventState.linkedModule,
        linkedObjectId: log.eventState.linkedObjectId,
        callbackStatus: log.eventState.callbackStatus,
        callbackError: log.eventState.callbackError,
        retryCount: log.eventState.retryCount,
        lastRetryAt: log.eventState.lastRetryAt,
      } : null,
      device: log.device ? {
        deviceCode: log.device.deviceCode,
        deviceName: log.device.deviceName,
        warehouseId: log.device.warehouseId,
      } : null,
    };
  }
}
