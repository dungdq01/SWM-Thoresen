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
      throw new BadRequestException('Item đã được dỡ rồi');
    }

    // Đếm thứ tự dỡ
    const unloadedCount = await this.prisma.receiptLine.count({
      where: { receiptHeaderId: receiptId, status: 'RECEIVED' },
    });

    await this.prisma.receiptLine.update({
      where: { id: receiptLineId },
      data: {
        status: 'RECEIVED',
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

    if (line.status !== 'RECEIVED') {
      throw new BadRequestException('Item chưa được dỡ');
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
  async completeUnloading(receiptId: string, userId?: string) {
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    if (receipt.status !== 'UNLOADING') {
      throw new BadRequestException('Receipt phải ở trạng thái PROCESSING');
    }

    const lines = await this.prisma.receiptLine.findMany({
      where: { receiptHeaderId: receiptId },
    });

    const openCount = lines.filter(l => l.status === 'OPEN').length;
    if (openCount > 0) {
      throw new BadRequestException(`Còn ${openCount} mặt hàng chưa dỡ`);
    }

    // Chuyển sang UNLOADED — dỡ hàng xong, chờ cân tare
    await this.prisma.receiptHeader.update({
      where: { id: receiptId },
      data: { status: 'UNLOADED', updatedBy: userId },
    });

    await this.prisma.receiptStatusHistory.create({
      data: {
        receiptHeaderId: receiptId,
        fromStatus: 'UNLOADING',
        toStatus: 'UNLOADED',
        transitionCode: 'COMPLETE_UNLOADING',
        triggeredBy: userId,
        correlationId: receiptId,
        occurredAt: new Date(),
      },
    });

    return this.getUnloadingStatus(receiptId);
  }

  /**
   * Kiểm tra đã dỡ hàng xong chưa (dùng cho validation cân lần 2)
   */
  async isUnloadingComplete(receiptId: string): Promise<boolean> {
    const lines = await this.prisma.receiptLine.findMany({
      where: { receiptHeaderId: receiptId },
    });
    return lines.length > 0 && lines.every(l => l.status === 'RECEIVED' || l.status === 'CANCELLED');
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

    const allUnloaded = receipt.lines.length > 0 && receipt.lines.every(
      l => l.status === 'RECEIVED' || l.status === 'CANCELLED'
    );

    return {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber || '',
      vehicleNumber: receipt.vehicleNumber,
      status: receipt.status,
      owner: receipt.owner,
      warehouse: receipt.warehouse,
      hasGross: !!grossLog,
      hasTare: !!tareLog,
      allUnloaded,
      lines: receipt.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        itemId: l.itemId,
        itemCode: (l as any).item?.itemCode || '',
        itemName: (l as any).item?.itemName || '',
        uomCode: (l as any).uom?.uomCode || '',
        expectedQty: Number(l.expectedQty),
        unloadSequence: l.unloadSequenceNo,
        lineStatus: l.status,
        locationId: l.locationId || null,
        locationCode: (l as any).location?.locationCode || null,
        isUnloaded: l.status === 'RECEIVED',
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
