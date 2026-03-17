/**
 * [DRAFT] M8 Weighbridge → M5 Outbound Bridge Adapter
 *
 * ⚠️ FILE TẠM THỜI - Logic chưa xác nhận với khách hàng
 *
 * Mục đích:
 * - Khi phiếu cân (M8) của SHP được xác nhận (VALIDATED), cập nhật trạng thái Shipment (M5)
 * - SHP chuyển từ CONFIRMED → WEIGHING_1 (đang cân lần 1)
 * - Khi có 1 SHP đang cân → SO chuyển sang trạng thái WEIGHING (đang cân)
 * - Tách biệt logic cross-module để dễ sửa/xóa sau này
 *
 * Cách xóa logic này:
 * 1. Xóa file này
 * 2. Xóa import và gọi trong weighbridge-log.service.ts
 * 3. Đặt FEATURES.M8_M5_AUTO_SYNC = false trong feature-flags_draft.ts
 *
 * @author Cascade AI
 * @since 2026-03-17
 * @status DRAFT - Pending customer confirmation
 */

import { PrismaClient } from '@prisma/client';

export interface OutboundWeighLogData {
  id: string;
  shipmentId?: string;
  grossWeightKg?: number;
  weighingTimestamp?: Date;
}

export interface OutboundBridgeResult {
  success: boolean;
  shipmentId?: string;
  shipmentNewStatus?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
  soUpdated?: boolean;
  soId?: string;
  soNewStatus?: string;
}

export class OutboundBridgeAdapter {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * [DRAFT] Notify M5 Outbound khi weigh log được xác nhận
   *
   * Flow: M8 VALIDATED → M5 Shipment CONFIRMED → WEIGHING_1
   *       + SO chuyển sang WEIGHING nếu có SHP đang cân
   */
  async onWeighLogConfirmed(
    log: OutboundWeighLogData,
    context: { userId?: string } = {},
  ): Promise<OutboundBridgeResult> {
    // Guard: Không có shipmentId thì skip
    if (!log.shipmentId) {
      return {
        success: true,
        skipped: true,
        reason: 'No shipmentId linked to weigh log',
      };
    }

    try {
      const shipment = await this.prisma.shipmentHeader.findUnique({
        where: { id: log.shipmentId },
        select: { id: true, status: true, salesOrderId: true, shipmentNumber: true },
      });

      if (!shipment) {
        return {
          success: false,
          skipped: true,
          reason: `Shipment ${log.shipmentId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu shipment đang ở CONFIRMED
      if (shipment.status !== 'CONFIRMED') {
        return {
          success: true,
          skipped: true,
          shipmentId: shipment.id,
          reason: `Shipment not in CONFIRMED state (current: ${shipment.status})`,
        };
      }

      // Update shipment status sang WEIGHING_1
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update shipment
        const updatedShipment = await tx.shipmentHeader.update({
          where: { id: log.shipmentId },
          data: {
            status: 'WEIGHING_1' as any,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        // Log status change
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentHeaderId: log.shipmentId!,
            entityLevel: 'HEADER',
            fromStatus: 'CONFIRMED',
            toStatus: 'WEIGHING_1',
            triggerAction: 'M8_WEIGHBRIDGE_CONFIRMED',
            changedBy: context.userId,
            correlationId: log.id,
            note: `Weigh log confirmed. GrossWeightKg: ${log.grossWeightKg || 'N/A'}`,
          },
        });

        return updatedShipment;
      });

      // [DRAFT] Cập nhật SO status nếu có SHP đang cân
      const soResult = await this.updateSOStatusIfNeeded(shipment.salesOrderId, context);

      return {
        success: true,
        shipmentId: updated.id,
        shipmentNewStatus: 'WEIGHING_1',
        skipped: false,
        soUpdated: soResult.updated,
        soId: soResult.soId,
        soNewStatus: soResult.newStatus,
      };
    } catch (error) {
      // Silent fail - không throw, chỉ return error
      return {
        success: false,
        shipmentId: log.shipmentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * [DRAFT] Notify M5 Outbound khi ghi số cân lần 1 (gross weight)
   *
   * Flow: M8 WEIGHING (đã ghi gross) → M5 Shipment WEIGHING_1 → WEIGHING_2
   */
  async onGrossWeightRecorded(
    log: OutboundWeighLogData,
    context: { userId?: string } = {},
  ): Promise<OutboundBridgeResult> {
    if (!log.shipmentId) {
      return {
        success: true,
        skipped: true,
        reason: 'No shipmentId linked to weigh log',
      };
    }

    try {
      const shipment = await this.prisma.shipmentHeader.findUnique({
        where: { id: log.shipmentId },
        select: { id: true, status: true, salesOrderId: true, shipmentNumber: true },
      });

      if (!shipment) {
        return {
          success: false,
          skipped: true,
          reason: `Shipment ${log.shipmentId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu shipment đang ở WEIGHING_1
      if (shipment.status !== 'WEIGHING_1') {
        return {
          success: true,
          skipped: true,
          shipmentId: shipment.id,
          reason: `Shipment not in WEIGHING_1 state (current: ${shipment.status})`,
        };
      }

      // Update shipment status sang WEIGHING_2
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedShipment = await tx.shipmentHeader.update({
          where: { id: log.shipmentId },
          data: {
            status: 'WEIGHING_2' as any,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentHeaderId: log.shipmentId!,
            entityLevel: 'HEADER',
            fromStatus: 'WEIGHING_1',
            toStatus: 'WEIGHING_2',
            triggerAction: 'M8_GROSS_WEIGHT_RECORDED',
            changedBy: context.userId,
            correlationId: log.id,
            note: `Gross weight recorded: ${log.grossWeightKg || 'N/A'} kg`,
          },
        });

        return updatedShipment;
      });

      return {
        success: true,
        shipmentId: updated.id,
        shipmentNewStatus: 'WEIGHING_2',
        skipped: false,
      };
    } catch (error) {
      return {
        success: false,
        shipmentId: log.shipmentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * [DRAFT] Notify M5 Outbound khi ghi số cân lần 2 (tare weight) - hoàn thành cân
   *
   * Flow: M8 COMPLETED → M5 Shipment WEIGHING_2 → WEIGHED
   */
  async onTareWeightRecorded(
    log: OutboundWeighLogData & { tareWeightKg?: number; netWeightKg?: number },
    context: { userId?: string } = {},
  ): Promise<OutboundBridgeResult> {
    if (!log.shipmentId) {
      return {
        success: true,
        skipped: true,
        reason: 'No shipmentId linked to weigh log',
      };
    }

    try {
      const shipment = await this.prisma.shipmentHeader.findUnique({
        where: { id: log.shipmentId },
        select: { id: true, status: true, salesOrderId: true, shipmentNumber: true },
      });

      if (!shipment) {
        return {
          success: false,
          skipped: true,
          reason: `Shipment ${log.shipmentId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu shipment đang ở WEIGHING_2
      if (shipment.status !== 'WEIGHING_2') {
        return {
          success: true,
          skipped: true,
          shipmentId: shipment.id,
          reason: `Shipment not in WEIGHING_2 state (current: ${shipment.status})`,
        };
      }

      // Update shipment status sang WEIGHED
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedShipment = await tx.shipmentHeader.update({
          where: { id: log.shipmentId },
          data: {
            status: 'WEIGHED' as any,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentHeaderId: log.shipmentId!,
            entityLevel: 'HEADER',
            fromStatus: 'WEIGHING_2',
            toStatus: 'WEIGHED',
            triggerAction: 'M8_TARE_WEIGHT_RECORDED',
            changedBy: context.userId,
            correlationId: log.id,
            note: `Weighing completed. Tare: ${log.tareWeightKg || 'N/A'} kg, Net: ${log.netWeightKg || 'N/A'} kg`,
          },
        });

        return updatedShipment;
      });

      return {
        success: true,
        shipmentId: updated.id,
        shipmentNewStatus: 'WEIGHED',
        skipped: false,
      };
    } catch (error) {
      return {
        success: false,
        shipmentId: log.shipmentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * [DRAFT] Cập nhật SO status khi có SHP đang cân
   *
   * Logic: 1 SO có nhiều SHP, chỉ cần 1 SHP ở trạng thái đang cân (WEIGHING_1)
   * thì SO chuyển sang trạng thái WEIGHING (đang cân)
   *
   * ⚠️ Chỉ cập nhật nếu SO đang ở trạng thái CONFIRMED
   */
  private async updateSOStatusIfNeeded(
    salesOrderId: string | null,
    context: { userId?: string } = {},
  ): Promise<{ updated: boolean; soId?: string; newStatus?: string; reason?: string }> {
    if (!salesOrderId) {
      return { updated: false, reason: 'No salesOrderId linked to shipment' };
    }

    try {
      const so = await this.prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        select: { id: true, soNumber: true, status: true },
      });

      if (!so) {
        return { updated: false, soId: salesOrderId, reason: `SO ${salesOrderId} not found` };
      }

      // Chỉ cập nhật nếu SO đang ở CONFIRMED
      if (so.status !== 'CONFIRMED') {
        return {
          updated: false,
          soId: so.id,
          reason: `SO not in CONFIRMED state (current: ${so.status})`,
        };
      }

      // Cập nhật SO sang WEIGHING
      await this.prisma.salesOrder.update({
        where: { id: so.id },
        data: {
          status: 'WEIGHING' as any,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
      });

      return {
        updated: true,
        soId: so.id,
        newStatus: 'WEIGHING',
      };
    } catch (error) {
      // Silent fail
      return {
        updated: false,
        soId: salesOrderId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
