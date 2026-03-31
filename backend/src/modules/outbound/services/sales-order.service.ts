import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto, SalesOrderQueryDto } from '../dto/sales-order.dto';
import { SoQtyRollupService } from './so-qty-rollup.service';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReversalEngineService } = require('../../inventory-core/application/reversal-engine.service');

// Map frontend soType to schema orderType
const SO_TYPE_MAP: Record<string, string> = {
  SEA: 'STANDARD',
  LAND: 'CONSIGNMENT',
};

// Status passthrough — return raw DB enum values to frontend
// FE uses: DRAFT, CONFIRMED, WEIGHING, PARTIALLY_RELEASED, FULLY_RELEASED, SHIPPED, CLOSED, CANCELLED

@Injectable()
export class SalesOrderService {
  private readonly logger = new Logger(SalesOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly soQtyRollup: SoQtyRollupService,
  ) {}

  async create(dto: CreateSalesOrderDto, userId?: string) {
    const soNumber = await this.generateSoNumber();
    const externalId = `SO-WEB-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const correlationId = uuidv4();

    // Get first warehouse for owner
    const warehouse = await this.prisma.mdWarehouse.findFirst({
      where: { isActive: true },
    });

    // Get or create a default customer
    const customer = await this.prisma.mdCustomer.findFirst({
      where: { isActive: true },
    });

    if (!warehouse || !customer) {
      throw new BadRequestException('No active warehouse or customer found');
    }

    // Convert UOM to KG for each line
    const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
    const linesWithConversion = await Promise.all(
      dto.lines.map(async (line) => {
        const qty = Number(line.expectedQty || 0);
        let expectedQtyKg = qty;

        if (line.uomId && kgUom && line.uomId !== kgUom.id) {
          // Try item-specific conversion first
          let conversion = await this.prisma.mdUomConversion.findFirst({
            where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
          });
          if (!conversion) {
            // Fall back to global conversion
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

    const totalExpectedQtyKg = linesWithConversion.reduce((sum, l) => sum + l.expectedQtyKg, 0);

    const salesOrder = await this.prisma.salesOrder.create({
      data: {
        soNumber,
        externalSoNumber: dto.blNumber, // Store B/L number in externalSoNumber
        orderType: SO_TYPE_MAP[dto.soType] as any || 'STANDARD',
        status: 'DRAFT',
        ownerId: dto.ownerId,
        customerId: customer.id,
        warehouseId: warehouse.id,
        vesselName: dto.vesselName || null,
        vehiclePlate: dto.vehiclePlate || null,
        notes: dto.notes,
        totalExpectedQtyKg,
        externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: userId,
        lines: {
          create: linesWithConversion.map((line, idx) => ({
            lineNumber: idx + 1,
            itemId: line.itemId,
            cargoForm: 'BULK',
            uomId: line.uomId || (uuidv4()), // Will need valid UOM
            expectedQty: Number(line.expectedQty || 0),
            expectedQtyKg: line.expectedQtyKg,
            notes: line.notes,
            status: 'OPEN',
          })),
        },
      },
      include: {
        lines: { include: { item: true, uom: true } },
        owner: true,
      },
    });

    return this.transformSalesOrder(salesOrder);
  }

  async findAll(query: SalesOrderQueryDto) {
    const { page = 1, pageSize = 20, keyword, status, ownerId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { soNumber: { contains: keyword, mode: 'insensitive' } },
        { externalSoNumber: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (ownerId) where.ownerId = ownerId;

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true,
          lines: { include: { item: true, uom: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    // Enrich with actual shipped qty from ShipmentLines
    const soIds = items.map((so: any) => so.id);
    let shippedBySoLineId = new Map<string, number>();
    let shippedBySoItemKey = new Map<string, number>();
    let shippedBySoId = new Map<string, number>();
    let activeCountMap = new Map<string, number>();

    if (soIds.length > 0) {
      const shippedLines = await this.prisma.shipmentLine.findMany({
        where: {
          header: { salesOrderId: { in: soIds } },
          lineStatus: 'LINE_SHIPPED',
        },
        select: {
          soLineId: true,
          itemId: true,
          shippedQty: true,
          netWeightKg: true,
          header: { select: { salesOrderId: true } },
        },
      });

      for (const sl of shippedLines) {
        const qty = Number(sl.shippedQty || sl.netWeightKg || 0);
        if (qty <= 0) continue;
        const soId = sl.header?.salesOrderId;
        if (soId) shippedBySoId.set(soId, (shippedBySoId.get(soId) || 0) + qty);
        if (sl.soLineId) {
          shippedBySoLineId.set(sl.soLineId, (shippedBySoLineId.get(sl.soLineId) || 0) + qty);
        } else if (soId && sl.itemId) {
          const key = `${soId}|${sl.itemId}`;
          shippedBySoItemKey.set(key, (shippedBySoItemKey.get(key) || 0) + qty);
        }
      }

      const activeCounts = await this.prisma.shipmentHeader.groupBy({
        by: ['salesOrderId'],
        where: { salesOrderId: { in: soIds }, status: { notIn: ['SHIPPED', 'CLOSED', 'CANCELLED'] } },
        _count: { id: true },
      });
      for (const row of activeCounts) {
        if (row.salesOrderId) activeCountMap.set(row.salesOrderId, row._count.id);
      }
    }

    const data = items.map((so: any) => {
      const transformed = this.transformSalesOrder(so);

      // Enrich lines with actual shipped qty
      if (transformed.lines) {
        for (const line of transformed.lines) {
          const actualShipped = shippedBySoLineId.get(line.id)
            ?? shippedBySoItemKey.get(`${so.id}|${line.itemId}`)
            ?? 0;
          if (actualShipped > 0) {
            line.shippedQtyKg = actualShipped;
            line.shippedQty = actualShipped;
          }
        }
      }

      const totalShipped = shippedBySoId.get(so.id) || 0;
      if (totalShipped > 0) {
        transformed.totalShippedQty = totalShipped;
        transformed.totalShippedQtyKg = totalShipped;
      }

      // Fix stale status
      if (!['CLOSED', 'CANCELLED'].includes(so.status) && totalShipped > 0) {
        const totalExpected = Number(so.totalExpectedQtyKg || 0);
        const activeCount = activeCountMap.get(so.id) || 0;
        if (activeCount === 0 && totalExpected > 0 && totalShipped >= totalExpected * 0.99) {
          transformed.status = 'SHIPPED';
          this.prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'SHIPPED' } }).catch(() => {});
        } else if (totalShipped > 0 && totalShipped < totalExpected && ['CONFIRMED', 'WEIGHING'].includes(so.status)) {
          transformed.status = 'PARTIALLY_RELEASED';
          this.prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'PARTIALLY_RELEASED' } }).catch(() => {});
        }
      }

      return transformed;
    });

    // Attach shipments for each SO
    let shipmentsBySoId = new Map<string, any[]>();
    if (soIds.length > 0) {
      const shipments = await this.prisma.shipmentHeader.findMany({
        where: { salesOrderId: { in: soIds } },
        select: {
          id: true,
          shipmentNumber: true,
          vehicleNumber: true,
          status: true,
          createdAt: true,
          salesOrderId: true,
          lines: {
            select: {
              itemId: true,
              shippedQty: true,
              netWeightKg: true,
              grossWeightKg: true,
              lineStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      for (const shp of shipments) {
        const list = shipmentsBySoId.get(shp.salesOrderId!) || [];
        list.push(shp);
        shipmentsBySoId.set(shp.salesOrderId!, list);
      }
    }

    const enrichedData = data.map((so: any) => ({
      ...so,
      shipments: shipmentsBySoId.get(so.id) || [],
    }));

    return {
      data: enrichedData,
      items: enrichedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        owner: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order ${id} not found`);
    }

    return this.transformSalesOrder(salesOrder);
  }

  async update(id: string, dto: UpdateSalesOrderDto, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });

    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Can only update Sales Orders in DRAFT status');
    }

    if (dto.lines) {
      await this.prisma.salesOrderLine.deleteMany({ where: { soId: id } });
    }

    // Convert UOM to KG for each line
    let linesWithConversion: any[] = [];
    let totalExpectedQtyKg = 0;
    if (dto.lines) {
      const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
      linesWithConversion = await Promise.all(
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
      totalExpectedQtyKg = linesWithConversion.reduce((sum, l) => sum + l.expectedQtyKg, 0);
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: {
        ...(dto.soType && { orderType: SO_TYPE_MAP[dto.soType] as any }),
        ...(dto.blNumber && { externalSoNumber: dto.blNumber }),
        ...(dto.vesselName !== undefined && { vesselName: dto.vesselName || null }),
        ...(dto.vehiclePlate !== undefined && { vehiclePlate: dto.vehiclePlate || null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.lines && { totalExpectedQtyKg }),
        updatedBy: userId,
        ...(dto.lines && {
          lines: {
            create: linesWithConversion.map((line, idx) => ({
              lineNumber: idx + 1,
              itemId: line.itemId,
              cargoForm: 'BULK',
              uomId: line.uomId || existing.warehouseId, // Fallback
              expectedQty: Number(line.expectedQty || 0),
              expectedQtyKg: line.expectedQtyKg,
              notes: line.notes,
              status: 'OPEN',
            })),
          },
        }),
      },
      include: {
        owner: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    return this.transformSalesOrder(updated);
  }

  async confirm(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: { include: { uom: true } } },
    });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Can only confirm Sales Orders in DRAFT status');
    }

    // SO confirm = chỉ đổi status, KHÔNG post M3 tại đây.
    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    await this.prisma.salesOrderStatusHistory.create({
      data: { soId: id, entityLevel: 'HEADER', fromStatus: existing.status, toStatus: 'CONFIRMED', triggerAction: 'CONFIRM_SO', changedBy: userId, correlationId: id },
    });

    return this.transformSalesOrder(updated);
  }

  async cancel(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (!['DRAFT', 'CONFIRMED'].includes(existing.status)) {
      throw new BadRequestException('Can only cancel Sales Orders in DRAFT or CONFIRMED status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    await this.prisma.salesOrderStatusHistory.create({
      data: { soId: id, entityLevel: 'HEADER', fromStatus: existing.status, toStatus: 'CANCELLED', triggerAction: 'CANCEL_SO', changedBy: userId, correlationId: id },
    });

    return this.transformSalesOrder(updated);
  }

  async close(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (!['PARTIALLY_RELEASED', 'FULLY_RELEASED', 'SHIPPED'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể đóng SO ở trạng thái Xuất 1 phần, Đã giao đủ phiếu hoặc Đã xuất kho');
    }

    // Recalculate SO qty rollup trước khi đóng — đảm bảo totalShippedQtyKg chính xác
    try {
      const rollupResult = await this.soQtyRollup.recalculateSo(id);
      if (rollupResult) {
        this.logger.log(`SO close rollup: ${rollupResult.soNumber} — ${rollupResult.totalShippedQtyKg}kg shipped, ${rollupResult.linesUpdated} lines`);
      }
    } catch (e: any) {
      this.logger.warn(`SO close rollup failed for ${id}: ${e.message}`);
    }

    // Reconcile inventory: post SHIP_CONFIRMED cho bất kỳ shipment line nào chưa có inventTrans
    try {
      await this.reconcileShippedInventory(id, userId);
    } catch (e: any) {
      this.logger.warn(`SO close inventory reconcile failed for ${id}: ${e.message}`);
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CLOSED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    // Ghi status history
    await this.prisma.salesOrderStatusHistory.create({
      data: {
        soId: id,
        entityLevel: 'HEADER',
        fromStatus: existing.status,
        toStatus: 'CLOSED',
        triggerAction: 'CLOSE_SO',
        changedBy: userId,
        correlationId: id,
      },
    });

    return this.transformSalesOrder(updated);
  }

  async unconfirm(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'CONFIRMED') {
      throw new BadRequestException('Can only unconfirm Sales Orders in CONFIRMED status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'DRAFT', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    await this.prisma.salesOrderStatusHistory.create({
      data: { soId: id, entityLevel: 'HEADER', fromStatus: existing.status, toStatus: 'DRAFT', triggerAction: 'UNCONFIRM_SO', changedBy: userId, correlationId: id },
    });

    return this.transformSalesOrder(updated);
  }

  /**
   * Reconcile inventory: ensure all shipped shipment lines have SHIP_CONFIRMED posted.
   * Weighbridge may fail silently → on_hand not deducted. This catches up.
   */
  private async reconcileShippedInventory(soId: string, userId?: string) {
    const shipments = await this.prisma.shipmentHeader.findMany({
      where: { salesOrderId: soId },
      include: {
        lines: {
          where: { lineStatus: 'LINE_SHIPPED', shippedQty: { gt: 0 } },
          include: { uom: true },
        },
        warehouse: { select: { warehouseCode: true } },
        owner: { select: { ownerCode: true } },
      },
    });

    const postingEngine = new PostingEngineService(this.prisma);
    let posted = 0;
    let skipped = 0;

    for (const shp of shipments) {
      for (const line of shp.lines) {
        // Check if inventTrans already exists for this shipment line
        const existingTrans = await this.prisma.inventTrans.findFirst({
          where: {
            refType: 'SHIPMENT',
            refId: shp.id,
            refLineId: line.id,
            transType: 'ISSUE',
            isReversal: false,
          },
        });

        if (existingTrans) {
          skipped++;
          continue;
        }

        // Post SHIP_CONFIRMED for missing line
        const qty = Number(line.shippedQty || line.netWeightKg || 0);
        if (qty <= 0) continue;

        try {
          await postingEngine.postInventory({
            externalId: `SHP-RECONCILE-${shp.id}-${line.id}-${Date.now()}`,
            correlationId: `SHP-CLOSE-${soId}`,
            eventCode: 'SHIP_CONFIRMED',
            refType: 'SHIPMENT',
            refId: shp.id,
            refLineId: line.id,
            itemId: line.itemId,
            qty: String(qty),
            uomCode: (line as any).uom?.uomCode || 'KG',
            dimFrom: {
              warehouseCode: shp.warehouse?.warehouseCode,
              ownerCode: shp.owner?.ownerCode,
              statusCode: 'AVAILABLE',
            },
            sourceApp: 'M5_OUTBOUND',
            postedBy: userId,
          });
          posted++;
          this.logger.log(`Reconciled SHIP_CONFIRMED: shipment=${shp.shipmentNumber}, line=${line.id}, qty=${qty}kg`);
        } catch (err: any) {
          this.logger.warn(`Reconcile posting failed for line ${line.id}: ${err.message}`);
        }
      }
    }

    if (posted > 0) {
      this.logger.log(`SO ${soId} inventory reconcile: ${posted} posted, ${skipped} already existed`);
    }
  }

  /**
   * Reverse all SO_CONFIRMED M3 postings for an SO.
   * Called when SO is cancelled or unconfirmed.
   */
  private async reverseSoConfirmedPostings(soId: string, reasonCode: string, userId?: string) {
    try {
      const reversalEngine = new ReversalEngineService(this.prisma);

      const soTransactions = await this.prisma.inventTrans.findMany({
        where: { refId: soId, stage: 'EXPECTED', isReversal: false },
        select: { transId: true, id: true },
      });

      for (const trans of soTransactions) {
        const existingReversal = await (this.prisma as any).inventoryReversalLink.findFirst({
          where: { originalTransId: trans.id },
        });
        if (existingReversal) continue;

        try {
          await reversalEngine.reverseTransaction({
            externalId: `SO-CANCEL-REV-${soId}-${trans.transId}`,
            correlationId: `corr-so-cancel-${soId}`,
            originalTransId: trans.transId,
            reasonCode,
            note: `Auto-reversal: SO ${soId} cancelled/unconfirmed`,
            reversedBy: userId,
          });
        } catch (err: any) {
          console.error(`[M5→M3] Reversal failed for trans ${trans.transId}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error(`[M5→M3] SO reversal failed for SO ${soId} (non-blocking):`, err.message);
    }
  }

  async getNextSoNumber() {
    const code = await this.generateSoNumber();
    return { code };
  }

  private async generateSoNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `SO-${year}${month}`;

    const lastSo = await this.prisma.salesOrder.findFirst({
      where: { soNumber: { startsWith: prefix } },
      orderBy: { soNumber: 'desc' },
    });

    let sequence = 1;
    if (lastSo?.soNumber) {
      const lastSeq = parseInt(lastSo.soNumber.split('-').pop() || '0', 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private transformSalesOrder(so: any) {
    // Map schema orderType back to frontend soType
    const soTypeMap: Record<string, string> = { STANDARD: 'SEA', CONSIGNMENT: 'LAND', INTERNAL: 'SEA' };

    return {
      ...so,
      soType: soTypeMap[so.orderType] || 'SEA',
      blNumber: so.externalSoNumber,
      vesselName: so.vesselName || '',
      vehiclePlate: so.vehiclePlate || '',
      status: so.status,
      totalExpectedQty: Number(so.totalExpectedQtyKg || 0),
      totalShippedQty: Number(so.totalShippedQtyKg || 0),
      lines: so.lines?.map((l: any) => ({
        ...l,
        expectedQty: Number(l.expectedQty || 0),
        expectedQtyKg: Number(l.expectedQtyKg || l.expectedQty || 0),
        shippedQty: Number(l.shippedQty || 0),
        shippedQtyKg: Number(l.shippedQtyKg || l.shippedQty || 0),
      })),
    };
  }
}
