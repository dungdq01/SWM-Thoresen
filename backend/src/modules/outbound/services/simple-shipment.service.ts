import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateShipmentFromSoDto {
  salesOrderId: string;
  warehouseId: string;
  vehicleNumber: string;
  blNumber?: string;
  notes?: string;
  lines: {
    itemId: string;
    uomId: string;
    expectedQty: number;
    soLineId?: string;
    lotNumber?: string;
    notes?: string;
  }[];
}

export interface ShipmentQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  ownerId?: string;
}

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'NEW',
  CONFIRMED: 'CONFIRMED',
  WEIGHING_1: 'WEIGHING_1',
  WEIGHING_2: 'WEIGHING_2',
  WEIGHED: 'WEIGHED',
  ALLOCATED: 'ALLOCATED',
  PICKING: 'PICKING',
  LOADING: 'LOADING',
  SHIPPED: 'SHIPPED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

@Injectable()
export class SimpleShipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShipmentFromSoDto, userId?: string) {
    // Validate SO exists and is confirmed
    const so = await this.prisma.salesOrder.findUnique({
      where: { id: dto.salesOrderId },
      include: { owner: true, lines: true },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order ${dto.salesOrderId} not found`);
    }

    if (so.status !== 'CONFIRMED') {
      throw new BadRequestException('Can only create shipment from CONFIRMED Sales Order');
    }

    const shipmentNumber = await this.generateShipmentNumber();
    const externalId = `SHP-WEB-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const correlationId = uuidv4();

    // Convert UOM to KG for each line
    const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
    const linesWithConversion = await Promise.all(
      dto.lines.map(async (line) => {
        const qty = Number(line.expectedQty || 0);
        let expectedQtyKg = qty;

        if (line.uomId && kgUom && line.uomId !== kgUom.id) {
          let conversion = await this.prisma.mdUomConversion.findFirst({
            where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
          });
          if (!conversion) {
            conversion = await this.prisma.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
            });
          }
          if (conversion) {
            expectedQtyKg = qty * Number(conversion.conversionFactor);
          }
        }

        return { ...line, expectedQtyKg };
      }),
    );

    const shipment = await this.prisma.shipmentHeader.create({
      data: {
        shipmentNumber,
        soId: so.soNumber,
        salesOrderId: so.id,
        sourceType: 'SO',
        ownerId: so.ownerId,
        warehouseId: dto.warehouseId,
        vehicleNumber: dto.vehicleNumber,
        notes: dto.notes || null,
        status: 'DRAFT',
        externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: userId,
        lines: {
          create: linesWithConversion.map((line, idx) => ({
            lineNumber: idx + 1,
            soLineId: line.soLineId,
            itemId: line.itemId,
            cargoForm: 'BULK',
            uomId: line.uomId,
            expectedQty: line.expectedQtyKg,
            expectedQtyKg: line.expectedQtyKg,
            lineStatus: 'PENDING',
            notes: line.notes || null,
            createdBy: userId,
          })),
        },
      },
      include: {
        owner: true,
        warehouse: true,
        salesOrder: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    return this.transformShipment(shipment);
  }

  async findAll(query: ShipmentQueryParams) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const { keyword, status, ownerId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { shipmentNumber: { contains: keyword, mode: 'insensitive' } },
        { soId: { contains: keyword, mode: 'insensitive' } },
        { vehicleNumber: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (status) {
      const schemaStatus = Object.entries(STATUS_MAP).find(([_, v]) => v === status)?.[0];
      if (schemaStatus) where.status = schemaStatus;
    }
    if (ownerId) where.ownerId = ownerId;

    const [items, total] = await Promise.all([
      this.prisma.shipmentHeader.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true,
          warehouse: true,
          salesOrder: true,
          lines: { include: { item: true, uom: true } },
        },
      }),
      this.prisma.shipmentHeader.count({ where }),
    ]);

    return {
      data: items.map((s) => this.transformShipment(s)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id },
      include: {
        owner: true,
        warehouse: true,
        salesOrder: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return this.transformShipment(shipment);
  }

  async confirm(id: string, userId?: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    if (shipment.status !== 'DRAFT') {
      throw new BadRequestException('Can only confirm shipments in NEW status');
    }

    const updated = await this.prisma.shipmentHeader.update({
      where: { id },
      data: { status: 'CONFIRMED', updatedBy: userId },
      include: {
        owner: true,
        warehouse: true,
        salesOrder: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    return this.transformShipment(updated);
  }

  async delete(id: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    if (shipment.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete shipments in NEW status');
    }

    // Delete lines first, then header
    await this.prisma.shipmentLine.deleteMany({ where: { shipmentHeaderId: id } });
    await this.prisma.shipmentHeader.delete({ where: { id } });

    return { success: true, message: 'Shipment deleted successfully' };
  }

  async reportError(id: string, reasonCode: string, userId?: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    if (!['DRAFT', 'CONFIRMED'].includes(shipment.status)) {
      throw new BadRequestException('Can only report error for shipments in NEW or CONFIRMED status');
    }

    const updated = await this.prisma.shipmentHeader.update({
      where: { id },
      data: { 
        status: 'CANCELLED', 
        cancelReasonCode: reasonCode,
        updatedBy: userId,
      },
      include: {
        owner: true,
        warehouse: true,
        salesOrder: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    return this.transformShipment(updated);
  }

  async update(id: string, dto: Partial<CreateShipmentFromSoDto>, userId?: string) {
    const shipment = await this.prisma.shipmentHeader.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    if (shipment.status !== 'DRAFT') {
      throw new BadRequestException('Can only update shipments in NEW status');
    }

    const updateData: any = { updatedBy: userId };
    if (dto.warehouseId) {
      updateData.warehouse = { connect: { id: dto.warehouseId } };
    }
    if (dto.vehicleNumber) updateData.vehicleNumber = dto.vehicleNumber;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Update header
    await this.prisma.shipmentHeader.update({
      where: { id },
      data: updateData,
    });

    // Update lines if provided
    if (dto.lines && dto.lines.length > 0) {
      // Convert UOM to KG for each line
      const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
      const linesWithConversion = await Promise.all(
        dto.lines.map(async (line) => {
          const qty = Number(line.expectedQty || 0);
          let expectedQtyKg = qty;

          if (line.uomId && kgUom && line.uomId !== kgUom.id) {
            let conversion = await this.prisma.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
            });
            if (!conversion) {
              conversion = await this.prisma.mdUomConversion.findFirst({
                where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
              });
            }
            if (conversion) {
              expectedQtyKg = qty * Number(conversion.conversionFactor);
            }
          }

          return { ...line, expectedQtyKg };
        }),
      );

      // Delete existing lines and recreate
      await this.prisma.shipmentLine.deleteMany({ where: { shipmentHeaderId: id } });
      await this.prisma.shipmentLine.createMany({
        data: linesWithConversion.map((line, idx) => ({
          shipmentHeaderId: id,
          lineNumber: idx + 1,
          soLineId: line.soLineId,
          itemId: line.itemId,
          cargoForm: 'BULK' as any,
          uomId: line.uomId,
          expectedQty: line.expectedQtyKg,
          expectedQtyKg: line.expectedQtyKg,
          lineStatus: 'PENDING' as any,
          notes: line.notes || null,
          createdBy: userId,
        })),
      });
    }

    return this.findById(id);
  }

  private async generateShipmentNumber(): Promise<string> {
    const today = new Date();
    const prefix = `SHP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastShipment = await this.prisma.shipmentHeader.findFirst({
      where: { shipmentNumber: { startsWith: prefix } },
      orderBy: { shipmentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastShipment?.shipmentNumber) {
      const lastSeq = parseInt(lastShipment.shipmentNumber.slice(-5), 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private transformShipment(shipment: any) {
    const totalExpectedQty = shipment.lines?.reduce(
      (sum: number, l: any) => sum + Number(l.expectedQty || 0),
      0
    ) || 0;
    const totalShippedQty = shipment.lines?.reduce(
      (sum: number, l: any) => sum + Number(l.shippedQty || 0),
      0
    ) || 0;

    return {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      soNumber: shipment.soId,
      salesOrderId: shipment.salesOrderId,
      blNumber: shipment.salesOrder?.externalSoNumber || '',
      owner: shipment.owner ? {
        id: shipment.owner.id,
        ownerCode: shipment.owner.ownerCode,
        ownerName: shipment.owner.ownerName,
      } : null,
      warehouse: shipment.warehouse ? {
        id: shipment.warehouse.id,
        warehouseCode: shipment.warehouse.warehouseCode,
        warehouseName: shipment.warehouse.warehouseName,
      } : null,
      vehicleNumber: shipment.vehicleNumber,
      notes: shipment.notes || '',
      status: STATUS_MAP[shipment.status] || shipment.status,
      expectedQty: totalExpectedQty,
      shippedQty: totalShippedQty,
      lines: shipment.lines?.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        soLineId: line.soLineId,
        item: line.item ? {
          id: line.item.id,
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
        } : null,
        uom: line.uom ? {
          id: line.uom.id,
          uomCode: line.uom.uomCode,
          uomName: line.uom.uomName,
        } : null,
        expectedQty: Number(line.expectedQty || 0),
        shippedQty: Number(line.shippedQty || 0),
        lineStatus: line.lineStatus,
        notes: line.notes || '',
      })) || [],
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }
}
