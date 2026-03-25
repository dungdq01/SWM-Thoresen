/**
 * [DRAFT] M8 Weighbridge → M4 Inbound Bridge Adapter
 *
 * ⚠️ FILE TẠM THỜI - Logic chưa xác nhận với khách hàng
 *
 * Mục đích:
 * - Khi phiếu cân (M8) được xác nhận (VALIDATED), cập nhật trạng thái Receipt/ASN (M4)
 * - Khi có 1 ASN đang cân → PO chuyển sang trạng thái RECEIVING
 * - Tách biệt logic cross-module để dễ sửa/xóa sau này
 *
 * Cách xóa logic này:
 * 1. Xóa file này
 * 2. Xóa import và gọi trong weighbridge-log.service.ts
 * 3. Đặt FEATURES.M8_M4_AUTO_SYNC = false trong feature-flags_draft.ts
 *
 * @author Cascade AI
 * @since 2026-03-16
 * @status DRAFT - Pending customer confirmation
 */

import { PrismaClient } from '@prisma/client';
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');

export interface WeighLogData {
  id: string;
  receiptId?: string;
  grossWeightKg?: number;
  weighingTimestamp?: Date;
}

export interface WeighLogCompletedData {
  id: string;
  receiptId?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
}

export interface BridgeResult {
  success: boolean;
  receiptId?: string;
  newStatus?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
  poUpdated?: boolean;
  poId?: string;
  poNewStatus?: string;
}

export class InboundBridgeAdapter {
  private postingEngine: any;

  constructor(private readonly prisma: PrismaClient) {
    this.postingEngine = new PostingEngineService(prisma);
  }

  /**
   * [DRAFT] Notify M4 Inbound khi weigh log được xác nhận
   *
   * Flow: M8 VALIDATED → M4 Receipt AWAITING_WEIGHING → WEIGHED_IN
   *
   * ⚠️ Logic này có thể thay đổi:
   * - Hiện tại: Chuyển thẳng sang WEIGHED_IN
   * - Có thể sửa: Chỉ chuyển sang AWAITING_WEIGHING, chờ record weight
   */
  async onWeighLogConfirmed(
    log: WeighLogData,
    context: { userId?: string } = {},
  ): Promise<BridgeResult> {
    // Guard: Không có receiptId thì skip
    if (!log.receiptId) {
      return {
        success: true,
        skipped: true,
        reason: 'No receiptId linked to weigh log',
      };
    }

    try {
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id: log.receiptId },
        select: { id: true, status: true, correlationId: true },
      });

      if (!receipt) {
        return {
          success: false,
          skipped: true,
          reason: `Receipt ${log.receiptId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu receipt đang ở AWAITING_WEIGHING
      if (receipt.status !== 'CONFIRMED') {
        return {
          success: true,
          skipped: true,
          receiptId: receipt.id,
          reason: `Receipt not in AWAITING_WEIGHING state (current: ${receipt.status})`,
        };
      }

      // Update receipt status và gross weight
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update receipt
        const updatedReceipt = await tx.receiptHeader.update({
          where: { id: log.receiptId },
          data: {
            status: 'WEIGHING_1',
            grossWeightKg: log.grossWeightKg,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        // Log status change
        await tx.receiptStatusHistory.create({
          data: {
            receiptHeaderId: log.receiptId!,
            fromStatus: 'CONFIRMED',
            toStatus: 'WEIGHING_1',
            transitionCode: 'M8_WEIGHBRIDGE_CONFIRMED',
            triggeredBy: context.userId,
            correlationId: receipt.correlationId,
            metadata: {
              weighLogId: log.id,
              grossWeightKg: log.grossWeightKg,
              source: 'M8_WEIGHBRIDGE',
              adapter: 'inbound-bridge.adapter_draft',
              experimental: true,
            },
          },
        });

        return updatedReceipt;
      });

      // [DRAFT] Cập nhật PO status nếu có ASN đang cân
      const poResult = await this.updatePOStatusIfNeeded(updated.poId, context);

      return {
        success: true,
        receiptId: updated.id,
        newStatus: updated.status,
        skipped: false,
        poUpdated: poResult.updated,
        poId: poResult.poId,
        poNewStatus: poResult.newStatus,
      };
    } catch (error) {
      // Silent fail - không throw, chỉ return error
      return {
        success: false,
        receiptId: log.receiptId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Notify M4 Inbound khi ghi nhận trọng lượng lần 1 (grossWeight)
   *
   * Flow: M8 WEIGHING → M4 Receipt WEIGHED_IN → PROCESSING
   *
   * Khi ghi nhận TL lần 1, ASN chuyển từ "Đang cân lần 1" sang "Đang cân lần 2"
   */
  async onGrossWeightRecorded(
    log: { id: string; receiptId?: string; grossWeightKg?: number },
    context: { userId?: string } = {},
  ): Promise<BridgeResult> {
    if (!log.receiptId) {
      return {
        success: true,
        skipped: true,
        reason: 'No receiptId linked to weigh log',
      };
    }

    try {
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id: log.receiptId },
        select: { id: true, status: true, correlationId: true },
      });

      if (!receipt) {
        return {
          success: false,
          skipped: true,
          reason: `Receipt ${log.receiptId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu receipt đang ở WEIGHED_IN
      if (receipt.status !== 'WEIGHING_1') {
        return {
          success: true,
          skipped: true,
          receiptId: receipt.id,
          reason: `Receipt not in WEIGHED_IN state (current: ${receipt.status})`,
        };
      }

      // Update receipt status sang PROCESSING (đang cân lần 2)
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedReceipt = await tx.receiptHeader.update({
          where: { id: log.receiptId },
          data: {
            status: 'UNLOADING' as any,
            grossWeightKg: log.grossWeightKg,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        // Log status change
        await tx.receiptStatusHistory.create({
          data: {
            receiptHeaderId: log.receiptId!,
            fromStatus: 'WEIGHING_1',
            toStatus: 'UNLOADING',
            transitionCode: 'M8_GROSS_WEIGHT_RECORDED',
            triggeredBy: context.userId,
            correlationId: receipt.correlationId,
            metadata: {
              weighLogId: log.id,
              grossWeightKg: log.grossWeightKg,
              source: 'M8_WEIGHBRIDGE',
              adapter: 'inbound-bridge.adapter',
            },
          },
        });

        return updatedReceipt;
      });

      return {
        success: true,
        receiptId: updated.id,
        newStatus: 'UNLOADING',
        skipped: false,
      };
    } catch (error) {
      return {
        success: false,
        receiptId: log.receiptId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Notify M4 Inbound khi weigh log hoàn thành (đã cân lần 2)
   *
   * Flow: M8 COMPLETED → M4 Receipt PROCESSING → WEIGHED_OUT
   *       + Fill netWeightKg vào receivedQty của ReceiptLine
   *       + Aggregate receivedQty vào PO.totalReceivedQty
   */
  async onWeighLogCompleted(
    log: WeighLogCompletedData,
    context: { userId?: string } = {},
  ): Promise<BridgeResult> {
    if (!log.receiptId) {
      return {
        success: true,
        skipped: true,
        reason: 'No receiptId linked to weigh log',
      };
    }

    try {
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id: log.receiptId },
        select: {
          id: true,
          status: true,
          poId: true,
          correlationId: true,
          lines: { 
            select: { 
              id: true, 
              expectedQty: true,
              itemId: true,
              uom: { select: { uomCode: true } }
            } 
          },
          owner: { select: { ownerCode: true } },
          warehouse: { select: { warehouseCode: true } },
        },
      }) as any;

      if (!receipt) {
        return {
          success: false,
          skipped: true,
          reason: `Receipt ${log.receiptId} not found`,
        };
      }

      // Guard: Chỉ xử lý nếu receipt đang ở PROCESSING (đang cân lần 2)
      if (receipt.status !== 'UNLOADING') {
        return {
          success: true,
          skipped: true,
          receiptId: receipt.id,
          reason: `Receipt not in PROCESSING state (current: ${receipt.status})`,
        };
      }

      // Update receipt status, tare weight, net weight và receivedQty
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update receipt header
        const updatedReceipt = await tx.receiptHeader.update({
          where: { id: log.receiptId },
          data: {
            status: 'WEIGHING_2' as any,
            tareWeightKg: log.tareWeightKg,
            netWeightKg: log.netWeightKg,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });

        // Update receivedQty cho tất cả ReceiptLine = netWeightKg
        // (ASN thường chỉ có 1 line, nếu nhiều line thì cần logic phân bổ riêng)
        if (receipt.lines.length > 0 && log.netWeightKg != null) {
          const totalExpectedQty = receipt.lines.reduce(
            (sum: number, l: any) => sum + Number(l.expectedQty || 0),
            0,
          );

          for (const line of receipt.lines) {
            const ratio = totalExpectedQty > 0 ? Number(line.expectedQty || 0) / totalExpectedQty : 1;
            const receivedQty = log.netWeightKg * ratio;

            await tx.receiptLine.update({
              where: { id: line.id },
              data: {
                receivedQty: receivedQty,
                status: 'COMPLETED' as any,
                updatedBy: context.userId,
              },
            });

            // Post Inventory Automation
            try {
              await this.postingEngine.postInventory({
                externalId: `RCPT-AUTO-${receipt.id}-${line.id}-${Date.now()}`,
                correlationId: receipt.correlationId || log.id,
                eventCode: 'GOODS_RECEIVED',
                refType: 'RECEIPT',
                refId: receipt.id,
                refLineId: line.id,
                itemId: line.itemId,
                qty: String(receivedQty),
                uomCode: 'KG',
                dimTo: {
                  warehouseCode: receipt.warehouse?.warehouseCode,
                  locationCode: undefined,
                  ownerCode: receipt.owner?.ownerCode,
                  statusCode: 'AVAILABLE',
                },
                sourceApp: 'WEB',
                postedBy: context.userId || undefined,
              }, tx);
            } catch (postErr) {
               // Log error but don't fail the whole transaction yet unless critical
               console.error('[InboundBridge] Error posting inventory', postErr);
            }
          }
        }

        // Log status change
        await tx.receiptStatusHistory.create({
          data: {
            receiptHeaderId: log.receiptId!,
            fromStatus: 'UNLOADING',
            toStatus: 'WEIGHING_2',
            transitionCode: 'M8_WEIGHBRIDGE_COMPLETED',
            triggeredBy: context.userId,
            correlationId: receipt.correlationId,
            metadata: {
              weighLogId: log.id,
              tareWeightKg: log.tareWeightKg,
              netWeightKg: log.netWeightKg,
              source: 'M8_WEIGHBRIDGE',
              adapter: 'inbound-bridge.adapter_draft',
              experimental: true,
            },
          },
        });

        return updatedReceipt;
      });

      // [DRAFT] Aggregate receivedQty vào PO.totalReceivedQty
      const poResult = await this.aggregatePOReceivedQty(updated.poId, context);

      return {
        success: true,
        receiptId: updated.id,
        newStatus: 'WEIGHING_2',
        skipped: false,
        poUpdated: poResult.updated,
        poId: poResult.poId,
        poNewStatus: poResult.newStatus,
      };
    } catch (error) {
      return {
        success: false,
        receiptId: log.receiptId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * [DRAFT] Aggregate receivedQty từ các ASN đã done vào PO.totalReceivedQty
   *
   * Logic: SUM(netWeightKg) của các Receipt có status WEIGHED_OUT, RECEIVED, PUTAWAY, CLOSED
   */
  private async aggregatePOReceivedQty(
    poId: string | null,
    context: { userId?: string } = {},
  ): Promise<{ updated: boolean; poId?: string; newStatus?: string; totalReceivedQty?: number; reason?: string }> {
    if (!poId) {
      return { updated: false, reason: 'No poId linked to receipt' };
    }

    try {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber: poId },
        select: { id: true, poNumber: true, status: true },
      });

      if (!po) {
        return { updated: false, poId, reason: `PO ${poId} not found` };
      }

      // Aggregate netWeightKg từ các Receipt đã done (WEIGHED_OUT trở lên)
      const doneStatuses = ['WEIGHING_2', 'COMPLETED', 'CLOSED', 'CLOSED'];
      const aggregation = await this.prisma.receiptHeader.aggregate({
        where: {
          poId: poId,
          status: { in: doneStatuses as any },
        },
        _sum: {
          netWeightKg: true,
        },
      });

      const totalReceivedQty = Number(aggregation._sum.netWeightKg || 0);

      // Update PO.totalReceivedQty
      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          totalReceivedQty: totalReceivedQty,
          rowVersion: { increment: 1 },
          updatedBy: context.userId,
        },
      });

      return {
        updated: true,
        poId: po.id,
        newStatus: po.status,
        totalReceivedQty,
      };
    } catch (error) {
      return {
        updated: false,
        poId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cập nhật PO status khi có ASN đang cân
   *
   * Logic: 1 PO có nhiều ASN, chỉ cần 1 ASN ở trạng thái đang cân (WEIGHED_IN)
   * thì PO chuyển sang trạng thái RECEIVING (đang nhập)
   *
   * Chỉ cập nhật nếu PO đang ở trạng thái CONFIRMED
   */
  private async updatePOStatusIfNeeded(
    poId: string | null,
    context: { userId?: string } = {},
  ): Promise<{ updated: boolean; poId?: string; newStatus?: string; fromStatus?: string; reason?: string }> {
    if (!poId) {
      return { updated: false, reason: 'No poId linked to receipt' };
    }

    try {
      // Tìm PO bằng poNumber (poId trong receipt là poNumber, không phải UUID)
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber: poId },
        select: { id: true, poNumber: true, status: true },
      });

      if (!po) {
        return { updated: false, poId, reason: `PO ${poId} not found` };
      }

      // Chỉ cập nhật nếu PO đang ở CONFIRMED
      if (po.status !== 'CONFIRMED') {
        return {
          updated: false,
          poId: po.id,
          reason: `PO not in CONFIRMED state (current: ${po.status})`,
        };
      }

      const fromStatus = po.status;

      // Cập nhật PO sang RECEIVING trong transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: 'RECEIVING' as any,
            rowVersion: { increment: 1 },
            updatedBy: context.userId,
          },
        });
      });

      return {
        updated: true,
        poId: po.id,
        fromStatus,
        newStatus: 'RECEIVING',
      };
    } catch (error) {
      return {
        updated: false,
        poId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
