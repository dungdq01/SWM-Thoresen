import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WeighbridgeLogRepository, WeighLogQueryParams } from '../repositories/weighbridge-log.repository';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';

@Injectable()
export class WeighbridgeLogService {
  private readonly logger = new Logger(WeighbridgeLogService.name);

  constructor(
    private readonly logRepo: WeighbridgeLogRepository,
    private readonly prisma: PrismaService,
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
            lines: { select: { item: { select: { itemCode: true, itemName: true } } }, take: 1 },
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
            lines: { select: { item: { select: { itemCode: true, itemName: true } } }, take: 1 },
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
      tareWeightKg: log.tareWeightKg ? Number(log.tareWeightKg) : null,
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
    const ticketNumber = receipt?.receiptNumber || receipt?.asnId || shipment?.shipmentNumber || null;
    const asnId = receipt?.asnId || null;

    return {
      id: log.id,
      weighbridgeEventId: log.weighbridgeEventId,
      vehicleNumber: log.vehicleNumber,
      weighingType: log.weighingType,
      weighingSequence: log.weighingSequence,
      grossWeightKg: log.grossWeightKg ? Number(log.grossWeightKg) : null,
      tareWeightKg: log.tareWeightKg ? Number(log.tareWeightKg) : null,
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
      itemCode: log.itemCode || itemInfo?.itemCode || null,
      itemName: itemInfo?.itemName || null,
      asnId,
      notes: log.notes || null,
    };
  }

  private mapLogToDetailResponse(log: any) {
    return {
      ...this.mapLogToResponse(log),
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
