import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * Unloading Service — Dỡ hàng xuống kho
 *
 * Luồng (ngược Loading outbound):
 * 1. Xe cân gross ở Trạm cân (WEIGH_IN lần 1 — xe có hàng)
 * 2. START_UNLOADING: Bắt đầu dỡ → kiểm tra đã cân gross chưa
 * 3. UNLOAD_ITEM: User chọn vị trí dỡ → đánh dấu đã dỡ
 * 4. COMPLETE_UNLOADING: Dỡ xong → chờ xe đi cân tare (lần 2)
 * 5. Xe cân tare ở Trạm cân → KL tịnh = gross - tare → cộng tồn kho
 */

@Injectable()
export class UnloadingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra xe đã cân gross chưa (lần 1 cho inbound WEIGH_IN)
   */
  private async getGrossLog(receiptId: string) {
    return this.prisma.m8WeighbridgeLog.findFirst({
      where: {
        receiptId,
        weighingType: { in: ['WEIGH_IN'] },
        grossWeightKg: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Kiểm tra xe đã cân tare chưa (lần 2 cho inbound WEIGH_IN)
   */
  private async getTareLog(receiptId: string) {
    return this.prisma.m8WeighbridgeLog.findFirst({
      where: {
        receiptId,
        weighingType: { in: ['WEIGH_IN'] },
        netWeightKg: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bắt đầu dỡ hàng — yêu cầu xe đã cân gross
   */
  async startUnloading(receiptId: string, userId?: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    if (!['CONFIRMED', 'AWAITING_WEIGHING', 'WEIGHING_1', 'UNLOADING'].includes(receipt.status)) {
      throw new BadRequestException('Receipt phải ở trạng thái Chờ cân, Đã cân lần 1, hoặc Đang dỡ');
    }

    // Kiểm tra đã cân gross chưa
    const grossLog = await this.getGrossLog(receiptId);
    if (!grossLog) {
      throw new BadRequestException('Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng.');
    }

    // Chuyển sang PROCESSING nếu chưa
    if (receipt.status !== 'UNLOADING') {
      await this.prisma.receiptHeader.update({
        where: { id: receiptId },
        data: { status: 'UNLOADING', updatedBy: userId },
      });

      await this.prisma.receiptStatusHistory.create({
        data: {
          receiptHeaderId: receiptId,
          fromStatus: receipt.status,
          toStatus: 'UNLOADING',
          transitionCode: 'START_UNLOADING',
          triggeredBy: userId,
          correlationId: receiptId,
          occurredAt: new Date(),
        },
      });
    }

    return this.getUnloadingStatus(receiptId);
  }

  /**
   * Dỡ 1 item xuống vị trí kho
   */
  async unloadItem(receiptId: string, receiptLineId: string, locationId?: string, userId?: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    if (receipt.status !== 'UNLOADING') {
      throw new BadRequestException('Receipt phải ở trạng thái PROCESSING');
    }

    const grossLog = await this.getGrossLog(receiptId);
    if (!grossLog) {
      throw new BadRequestException('Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng.');
    }

    const line = await this.prisma.receiptLine.findUnique({
      where: { id: receiptLineId },
    });
    if (!line || line.receiptHeaderId !== receiptId) {
      throw new BadRequestException('Line does not belong to this receipt');
    }

    if (line.status !== 'OPEN') {
      throw new BadRequestException('Item đã được dỡ rồi hoặc đã cân');
    }

    // Multi-item: chỉ cho dỡ 1 item mỗi lần. Phải cân xong item trước mới dỡ tiếp.
    const hasUnloadedLine = await this.prisma.receiptLine.count({
      where: { receiptHeaderId: receiptId, status: 'UNLOADED' },
    });
    if (hasUnloadedLine > 0) {
      throw new BadRequestException('Đã có mặt hàng chờ cân. Vui lòng đưa xe đi cân trước khi dỡ tiếp.');
    }

    // Đếm thứ tự dỡ
    const unloadedCount = await this.prisma.receiptLine.count({
      where: { receiptHeaderId: receiptId, status: { in: ['UNLOADED', 'WEIGHED', 'RECEIVED'] } },
    });

    await this.prisma.receiptLine.update({
      where: { id: receiptLineId },
      data: {
        status: 'UNLOADED',
        locationId: locationId || null,
        unloadSequenceNo: unloadedCount + 1,
        updatedBy: userId,
      },
    });

    return this.getUnloadingStatus(receiptId);
  }

  /**
   * Hoàn tác dỡ 1 item
   */
  async undoUnloadItem(receiptId: string, receiptLineId: string, userId?: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    if (receipt.status !== 'UNLOADING') {
      throw new BadRequestException('Receipt phải ở trạng thái PROCESSING');
    }

    const line = await this.prisma.receiptLine.findUnique({
      where: { id: receiptLineId },
    });
    if (!line || line.receiptHeaderId !== receiptId) {
      throw new BadRequestException('Line does not belong to this receipt');
    }

    if (line.status !== 'UNLOADED') {
      throw new BadRequestException('Chỉ có thể hoàn tác item đã dỡ nhưng chưa cân');
    }

    await this.prisma.receiptLine.update({
      where: { id: receiptLineId },
      data: {
        status: 'OPEN',
        locationId: null,
        unloadSequenceNo: null,
        updatedBy: userId,
      },
    });

    return this.getUnloadingStatus(receiptId);
  }

  /**
   * Hoàn thành dỡ hàng
   */
  /**
   * Xác nhận sẵn sàng đưa xe đi cân — yêu cầu ít nhất 1 line UNLOADED
   * Multi-item: gọi sau mỗi đợt dỡ hàng, trước khi cân tiếp
   */
  async completeUnloading(receiptId: string, userId?: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    if (receipt.status !== 'UNLOADING') {
      throw new BadRequestException('Receipt phải ở trạng thái Đang dỡ hàng');
    }

    const lines = await this.prisma.receiptLine.findMany({
      where: { receiptHeaderId: receiptId, status: { not: 'CANCELLED' } },
    });

    const unloadedCount = lines.filter(l => l.status === 'UNLOADED').length;
    if (unloadedCount === 0) {
      throw new BadRequestException('Chưa có mặt hàng nào được dỡ. Vui lòng dỡ ít nhất 1 mặt hàng trước khi đưa xe đi cân.');
    }

    // Không đổi header status — vẫn giữ UNLOADING
    // Weighbridge recordWeight sẽ xử lý tính net và chuyển status
    return this.getUnloadingStatus(receiptId);
  }

  /**
   * Kiểm tra đã dỡ hàng xong chưa (dùng cho validation cân lần 2)
   */
  async isUnloadingComplete(receiptId: string): Promise<boolean> {
    const lines = await this.prisma.receiptLine.findMany({
      where: { receiptHeaderId: receiptId },
    });
    return lines.length > 0 && lines.every(l => ['UNLOADED', 'WEIGHED', 'RECEIVED', 'CANCELLED'].includes(l.status));
  }

  /**
   * Lấy danh sách vị trí có thể dỡ hàng vào (storage locations trong kho)
   */
  async getAvailableLocations(warehouseId: string) {
    const locations = await this.prisma.mdLocation.findMany({
      where: {
        warehouseId,
        isActive: true,
        status: 'OK',
        locationType: { in: ['STORAGE', 'RECEIVING'] },
      },
      select: {
        id: true,
        locationCode: true,
        locationType: true,
        stackLimitKg: true,
        areaM2: true,
      },
      orderBy: { locationCode: 'asc' },
    });

    return locations.map((loc) => ({
      locationId: loc.id,
      locationCode: loc.locationCode,
      locationType: loc.locationType,
      capacityKg: loc.stackLimitKg ? Number(loc.stackLimitKg) : null,
      areaM2: loc.areaM2 ? Number(loc.areaM2) : null,
    }));
  }

  /**
   * Lấy trạng thái dỡ hàng
   */
  async getUnloadingStatus(receiptId: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
      include: {
        lines: {
          include: {
            item: true,
            uom: true,
            location: { select: { id: true, locationCode: true } },
          },
          orderBy: { lineNumber: 'asc' },
        },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
      },
    });

    if (!receipt) throw new NotFoundException('Receipt not found');

    const grossLog = await this.getGrossLog(receiptId);
    const tareLog = await this.getTareLog(receiptId);

    // Fetch weighing history
    let weighingHistory: any[] = [];
    if (grossLog) {
      const records = await this.prisma.weighbridgeWeightRecord.findMany({
        where: { weighbridgeLogId: grossLog.id },
        orderBy: { sequence: 'asc' },
      });
      weighingHistory = records.map(r => ({
        sequence: r.sequence,
        weightKg: Number(r.weightKg),
        netWeightKg: r.netWeightKg ? Number(r.netWeightKg) : null,
        isFinal: r.isFinal,
        recordedAt: r.recordedAt,
        unloadedLineIds: r.unloadedLineIds || [],
      }));
    }

    const activeLines = receipt.lines.filter(l => l.status !== 'CANCELLED');
    const hasUnloadedLines = activeLines.some(l => l.status === 'UNLOADED');
    const allDone = activeLines.length > 0 && activeLines.every(l => ['WEIGHED', 'RECEIVED'].includes(l.status));

    return {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber || '',
      vehicleNumber: receipt.vehicleNumber,
      status: receipt.status,
      owner: receipt.owner,
      warehouse: receipt.warehouse,
      hasGross: !!grossLog,
      hasTare: !!tareLog,
      allDone,
      hasUnloadedLines,
      canWeigh: hasUnloadedLines, // có item UNLOADED → sẵn sàng đưa xe đi cân
      weighingHistory,
      lines: receipt.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        itemId: l.itemId,
        itemCode: (l as any).item?.itemCode || '',
        itemName: (l as any).item?.itemName || '',
        uomCode: (l as any).uom?.uomCode || '',
        expectedQty: Number(l.expectedQty),
        receivedQty: l.receivedQty ? Number(l.receivedQty) : 0,
        netWeightKg: l.netWeightKg ? Number(l.netWeightKg) : 0,
        unloadSequence: l.unloadSequenceNo,
        weighSequence: (l as any).weighSequenceNo,
        lineStatus: l.status,
        locationId: l.locationId || null,
        locationCode: (l as any).location?.locationCode || null,
      })),
    };
  }

  /**
   * Danh sách phiếu nhập cần dỡ hàng
   */
  async getReceiptsForUnloading(params: { warehouseId?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const where: any = {
      status: { in: ['CONFIRMED', 'AWAITING_WEIGHING', 'WEIGHING_1', 'UNLOADING'] },
    };
    if (params.warehouseId) where.warehouseId = params.warehouseId;

    const [items, total] = await Promise.all([
      this.prisma.receiptHeader.findMany({
        where,
        include: {
          lines: { include: { item: true, uom: true }, orderBy: { lineNumber: 'asc' } },
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.receiptHeader.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
