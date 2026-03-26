import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ShipmentStateMachineService } from './shipment-state-machine.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Loading Service — Xếp hàng lên xe
 *
 * Luồng:
 * 1. Xe cân tare ở Trạm cân (M8WeighbridgeLog TARE)
 * 2. START_LOADING: Bắt đầu xếp → kiểm tra đã cân tare chưa
 * 3. LOAD_ITEM: User chọn item → đánh dấu đã xếp lên xe
 * 4. COMPLETE_LOADING: Xếp xong → thông báo đưa xe đi cân gross
 * 5. Xe cân gross ở Trạm cân → KL tịnh = gross - tare
 */

@Injectable()
export class LoadingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly stateMachine: ShipmentStateMachineService,
  ) {}

  /**
   * Kiểm tra xe đã cân tare chưa (từ M8WeighbridgeLog)
   *
   * Outbound dùng weighingType = WEIGH_OUT:
   *   - Lần 1 (xe rỗng/tare) → grossWeightKg được ghi
   *   - Lần 2 (xe đầy/gross) → tareWeightKg được ghi
   * Nên chỉ cần có WEIGH_OUT record với grossWeightKg != null là đã cân tare.
   */
  private async getTareLog(shipmentId: string) {
    return this.prisma.m8WeighbridgeLog.findFirst({
      where: {
        shipmentId,
        weighingType: { in: ['TARE', 'WEIGH_OUT'] },
        grossWeightKg: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Kiểm tra xe đã cân gross chưa (lần 2 cho outbound)
   *
   * WEIGH_OUT lần 2 ghi vào tareWeightKg + netWeightKg.
   */
  private async getGrossLog(shipmentId: string) {
    return this.prisma.m8WeighbridgeLog.findFirst({
      where: {
        shipmentId,
        weighingType: { in: ['GROSS_LINE', 'WEIGH_OUT'] },
        netWeightKg: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bắt đầu xếp hàng — yêu cầu xe đã cân tare
   */
  async startLoading(shipmentId: string, userId?: string) {
    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    this.stateMachine.assertCanTransition(shipment.status as any, 'START_LOADING');

    // Kiểm tra xe đã cân tare chưa
    const tareLog = await this.getTareLog(shipmentId);
    if (!tareLog) {
      throw new BadRequestException('Xe chưa cân tare. Vui lòng đưa xe đến Trạm cân trước.');
    }

    const corrId = uuidv4();

    await this.prisma.shipmentHeader.update({
      where: { id: shipmentId },
      data: { status: 'LOADING', updatedBy: userId },
    });

    await this.historyRepo.create({
      shipmentHeaderId: shipmentId,
      entityLevel: 'HEADER',
      fromStatus: shipment.status,
      toStatus: 'LOADING',
      triggerAction: 'START_LOADING',
      changedBy: userId,
      correlationId: corrId,
    });

    return this.getLoadingStatus(shipmentId);
  }

  /**
   * Đánh dấu 1 item đã xếp lên xe
   */
  async loadItem(shipmentId: string, shipmentLineId: string, locationId?: string, userId?: string) {
    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    if (shipment.status !== 'LOADING') {
      throw new BadRequestException('Shipment must be in LOADING status');
    }

    // Kiểm tra xe đã cân tare chưa
    const tareLog = await this.getTareLog(shipmentId);
    if (!tareLog) {
      throw new BadRequestException('Xe chưa cân tare. Vui lòng đưa xe đến Trạm cân trước.');
    }

    const line = await this.lineRepo.findById(shipmentLineId);
    if (!line || line.shipmentHeaderId !== shipmentId) {
      throw new BadRequestException('Line does not belong to this shipment');
    }

    if (line.lineStatus !== 'PENDING') {
      throw new BadRequestException('Item đã được xếp rồi');
    }

    const corrId = uuidv4();

    const loadedCount = await this.prisma.shipmentLine.count({
      where: { shipmentHeaderId: shipmentId, lineStatus: 'LOADING' },
    });

    await this.prisma.shipmentLine.update({
      where: { id: shipmentLineId },
      data: {
        lineStatus: 'LOADING',
        loadedQty: line.expectedQtyKg,
        weighSequenceNo: loadedCount + 1,
        locationId: locationId || null,
        updatedBy: userId,
      },
    });

    await this.historyRepo.create({
      shipmentHeaderId: shipmentId,
      shipmentLineId: shipmentLineId,
      entityLevel: 'LINE',
      fromStatus: 'PENDING',
      toStatus: 'LOADING',
      triggerAction: 'LOAD_ITEM',
      changedBy: userId,
      correlationId: corrId,
    });

    return this.getLoadingStatus(shipmentId);
  }

  /**
   * Bỏ xếp 1 item (undo)
   */
  async unloadItem(shipmentId: string, shipmentLineId: string, userId?: string) {
    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    if (shipment.status !== 'LOADING') {
      throw new BadRequestException('Shipment must be in LOADING status');
    }

    const line = await this.lineRepo.findById(shipmentLineId);
    if (!line || line.shipmentHeaderId !== shipmentId) {
      throw new BadRequestException('Line does not belong to this shipment');
    }

    if (line.lineStatus !== 'LOADING') {
      throw new BadRequestException('Item chưa được xếp');
    }

    await this.prisma.shipmentLine.update({
      where: { id: shipmentLineId },
      data: {
        lineStatus: 'PENDING',
        loadedQty: 0,
        weighSequenceNo: null,
        updatedBy: userId,
      },
    });

    return this.getLoadingStatus(shipmentId);
  }

  /**
   * Hoàn thành xếp hàng
   */
  async completeLoading(shipmentId: string, userId?: string) {
    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    this.stateMachine.assertCanTransition(shipment.status as any, 'COMPLETE_LOADING');

    const lines = await this.prisma.shipmentLine.findMany({
      where: { shipmentHeaderId: shipmentId },
    });

    const pendingCount = lines.filter(l => l.lineStatus === 'PENDING').length;
    if (pendingCount > 0) {
      throw new BadRequestException(`Còn ${pendingCount} mặt hàng chưa xếp`);
    }

    const corrId = uuidv4();

    await this.prisma.shipmentHeader.update({
      where: { id: shipmentId },
      data: { status: 'LOADED', updatedBy: userId },
    });

    await this.prisma.shipmentLine.updateMany({
      where: { shipmentHeaderId: shipmentId, lineStatus: 'LOADING' },
      data: { lineStatus: 'WEIGHED_PASS' },
    });

    await this.historyRepo.create({
      shipmentHeaderId: shipmentId,
      entityLevel: 'HEADER',
      fromStatus: 'LOADING',
      toStatus: 'LOADED',
      triggerAction: 'COMPLETE_LOADING',
      changedBy: userId,
      correlationId: corrId,
    });

    return this.getLoadingStatus(shipmentId);
  }

  /**
   * Lấy trạng thái xếp hàng + thông tin cân
   */
  async getLoadingStatus(shipmentId: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id: shipmentId },
      include: {
        lines: {
          include: { item: true, uom: true, location: { select: { id: true, locationCode: true } } },
          orderBy: { lineNumber: 'asc' },
        },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
      },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    // Check weighing status from M8
    const tareLog = await this.getTareLog(shipmentId);
    const grossLog = await this.getGrossLog(shipmentId);

    return {
      shipmentId: shipment.id,
      shipmentNumber: shipment.shipmentNumber || '',
      vehicleNumber: shipment.vehicleNumber,
      status: shipment.status,
      owner: shipment.owner,
      warehouse: shipment.warehouse,
      // Chỉ trả trạng thái cân, KHÔNG trả số kg — tránh gian lận ăn bớt
      hasTare: !!tareLog,
      hasGross: !!grossLog,
      lines: shipment.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        itemId: l.itemId,
        itemCode: (l as any).item?.itemCode || '',
        itemName: (l as any).item?.itemName || '',
        uomCode: (l as any).uom?.uomCode || '',
        expectedQtyKg: Number(l.expectedQtyKg),
        loadSequence: l.weighSequenceNo,
        lineStatus: l.lineStatus,
        locationId: l.locationId || null,
        locationCode: (l as any).location?.locationCode || null,
        isLoaded: l.lineStatus !== 'PENDING' && l.lineStatus !== 'CANCELLED',
      })),
    };
  }

  /**
   * Lấy danh sách vị trí có tồn kho cho 1 mặt hàng trong 1 kho
   * Dùng cho dropdown chọn vị trí khi xếp hàng
   */
  async getLocationsWithStock(warehouseId: string, itemId: string) {
    const records = await this.prisma.onHand.findMany({
      where: {
        itemId,
        availableQty: { gt: 0 },
        inventDim: {
          warehouseId,
        },
      },
      include: {
        inventDim: {
          include: {
            location: { select: { id: true, locationCode: true, locationType: true } },
            owner: { select: { id: true, ownerCode: true, ownerName: true } },
            inventoryStatus: { select: { id: true, statusCode: true } },
          },
        },
        uom: { select: { uomCode: true } },
      },
      orderBy: { availableQty: 'desc' },
    });

    return records.map((r) => ({
      locationId: r.inventDim.location.id,
      locationCode: r.inventDim.location.locationCode,
      locationType: r.inventDim.location.locationType,
      ownerId: r.inventDim.owner.id,
      ownerCode: r.inventDim.owner.ownerCode,
      inventoryStatusId: r.inventDim.inventoryStatus.id,
      statusCode: r.inventDim.inventoryStatus.statusCode,
      availableQty: Number(r.availableQty),
      physicalQty: Number(r.physicalQty),
      uomCode: r.uom.uomCode,
    }));
  }

  /**
   * Danh sách phiếu xuất cần xếp hàng
   */
  async getShipmentsForLoading(params: { warehouseId?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const where: any = {
      status: { in: ['CONFIRMED', 'LOADING', 'LOADED', 'SHIPPED', 'COMPLETED'] },
    };
    if (params.warehouseId) where.warehouseId = params.warehouseId;

    const [items, total] = await Promise.all([
      this.prisma.shipmentHeader.findMany({
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
      this.prisma.shipmentHeader.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
