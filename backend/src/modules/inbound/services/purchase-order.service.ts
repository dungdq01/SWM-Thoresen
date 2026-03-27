import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CancelPurchaseOrderDto, PurchaseOrderQueryDto } from '../dto/purchase-order.dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReversalEngineService } = require('../../inventory-core/application/reversal-engine.service');

enum PoStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  RECEIVING = 'RECEIVING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RECEIVING', 'CLOSED'],
  RECEIVING: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  private includeDetail() {
    return {
      owner: { select: { ownerCode: true, ownerName: true } },
      vendor: { select: { vendorCode: true, vendorName: true } },
      warehouse: { select: { warehouseCode: true, warehouseName: true } },
      warehouses: {
        include: {
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        },
      },
      lines: {
        include: {
          item: { select: { itemCode: true, itemName: true, cargoForm: true } },
          uom: { select: { uomCode: true, description: true, decimalPrecision: true } },
        },
        orderBy: { lineNumber: 'asc' as const },
      },
    };
  }

  async getNextPoNumber(): Promise<{ code: string; prefix: string }> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${today}-`;

    const existing = await this.prisma.purchaseOrder.findMany({
      where: { poNumber: { startsWith: prefix } },
      select: { poNumber: true },
    });

    const numbers = existing
      .map((r) => parseInt(r.poNumber.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return { code: `${prefix}${String(nextNum).padStart(3, '0')}`, prefix: 'PO' };
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    const owner = await this.prisma.mdOwner.findUnique({ where: { id: dto.ownerId } });
    if (!owner) throw new BadRequestException('Owner not found');

    const vendor = await this.prisma.mdVendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new BadRequestException('Vendor not found');

    // Support both warehouseIds (new) and warehouseId (legacy)
    const warehouseIds = dto.warehouseIds?.length ? dto.warehouseIds : (dto.warehouseId ? [dto.warehouseId] : []);
    if (warehouseIds.length === 0) throw new BadRequestException('At least one warehouse is required');

    // Validate all warehouses exist
    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: { id: { in: warehouseIds } },
    });
    if (warehouses.length !== warehouseIds.length) {
      throw new BadRequestException('One or more warehouses not found');
    }

    const { code: poNumber } = await this.getNextPoNumber();

    // Get KG UOM for conversion target
    const kgUom = await this.prisma.mdUom.findUnique({ where: { uomCode: 'KG' } });

    const lineData = (dto.lines || []).map((line, idx) => ({
      lineNumber: idx + 1,
      itemId: line.itemId,
      uomId: line.uomId || null,
      expectedQty: line.expectedQty,
      notes: line.notes || null,
      status: 'OPEN',
    }));

    // Calculate totalExpectedQty in KG (convert from bag UOMs to KG)
    let totalExpectedQty = 0;
    for (const line of dto.lines || []) {
      const qty = Number(line.expectedQty) || 0;
      if (!line.uomId || !kgUom) {
        totalExpectedQty += qty;
        continue;
      }

      // Check if UOM is KG
      if (line.uomId === kgUom.id) {
        totalExpectedQty += qty;
        continue;
      }

      // Find conversion factor from line.uomId to KG
      const conversion = await this.prisma.mdUomConversion.findFirst({
        where: { fromUomId: line.uomId, toUomId: kgUom.id },
      });

      if (conversion) {
        totalExpectedQty += qty * Number(conversion.conversionFactor);
      } else {
        // No conversion found, use raw qty
        totalExpectedQty += qty;
      }
    }

    const createData = {
      poNumber,
      poType: dto.poType || 'SEA',
      status: PoStatus.NEW,
      ownerId: dto.ownerId,
      vendorId: dto.vendorId,
      warehouseId: warehouseIds[0] || null,
      vesselName: dto.vesselName || null,
      origin: dto.origin || null,
      blNumber: dto.blNumber || null,
      vehiclePlate: dto.vehiclePlate || null,
      notes: dto.notes || null,
      totalExpectedQty,
      totalReceivedQty: 0,
      createdBy: userId || null,
      updatedBy: userId || null,
      lines: { create: lineData },
      warehouses: {
        create: warehouseIds.map((whId) => ({ warehouseId: whId })),
      },
    };

    const po = await this.prisma.purchaseOrder.create({
      data: createData as any,
      include: this.includeDetail(),
    });

    return po;
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.includeDetail(),
    });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return po;
  }

  async findMany(query: PurchaseOrderQueryDto) {
    const { page = 1, limit: limitParam, pageSize, keyword, status, ownerId, vendorId, warehouseId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const limit = pageSize || limitParam || 20;

    const where: any = {};
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (ownerId) where.ownerId = ownerId;
    if (vendorId) where.vendorId = vendorId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (keyword) {
      where.OR = [
        { poNumber: { contains: keyword, mode: 'insensitive' } },
        { externalPoNumber: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const validSortFields: Record<string, string> = { createdAt: 'createdAt', poNumber: 'poNumber', status: 'status', expectedDeliveryDate: 'expectedDeliveryDate' };
    const orderField = validSortFields[sortBy] || 'createdAt';

    const [rawData, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.includeDetail(),
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    // Attach receipts for each PO (ReceiptHeader.poId stores poNumber string)
    const poNumbers = rawData.map((po) => po.poNumber);
    const receipts = poNumbers.length > 0
      ? await this.prisma.receiptHeader.findMany({
          where: { poId: { in: poNumbers } },
          select: {
            id: true,
            receiptNumber: true,
            asnId: true,
            poId: true,
            vehicleNumber: true,
            status: true,
            netWeightKg: true,
            grossWeightKg: true,
            tareWeightKg: true,
            createdAt: true,
            lines: {
              select: {
                itemId: true,
                receivedQty: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const receiptsByPo = new Map<string, typeof receipts>();
    for (const r of receipts) {
      const list = receiptsByPo.get(r.poId) || [];
      list.push(r);
      receiptsByPo.set(r.poId, list);
    }

    const data = rawData.map((po) => ({
      ...po,
      receipts: receiptsByPo.get(po.poNumber) || [],
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, userId?: string) {
    const po = await this.findById(id);
    if (po.status !== 'NEW') {
      throw new BadRequestException('Only NEW purchase orders can be updated');
    }

    const updateData: any = {
      updatedBy: userId || null,
    };

    if (dto.poType !== undefined) updateData.poType = dto.poType;
    if (dto.ownerId !== undefined) updateData.ownerId = dto.ownerId;
    if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;

    // Handle warehouseIds update
    const warehouseIds = dto.warehouseIds?.length ? dto.warehouseIds : (dto.warehouseId ? [dto.warehouseId] : null);
    if (warehouseIds) {
      // Validate all warehouses exist
      const warehouses = await this.prisma.mdWarehouse.findMany({
        where: { id: { in: warehouseIds } },
      });
      if (warehouses.length !== warehouseIds.length) {
        throw new BadRequestException('One or more warehouses not found');
      }
      updateData.warehouseId = warehouseIds[0] || null;

      // Delete existing warehouse relations and recreate
      await this.prisma.purchaseOrderWarehouse.deleteMany({ where: { poId: id } });
      await this.prisma.purchaseOrderWarehouse.createMany({
        data: warehouseIds.map((whId) => ({ poId: id, warehouseId: whId })),
      });
    }
    if (dto.vesselName !== undefined) updateData.vesselName = dto.vesselName || null;
    if (dto.origin !== undefined) updateData.origin = dto.origin || null;
    if (dto.blNumber !== undefined) updateData.blNumber = dto.blNumber || null;
    if (dto.vehiclePlate !== undefined) updateData.vehiclePlate = dto.vehiclePlate || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Handle lines update if provided
    if (dto.lines && dto.lines.length > 0) {
      // Get KG UOM for conversion
      const kgUom = await this.prisma.mdUom.findUnique({ where: { uomCode: 'KG' } });

      // Delete existing lines and recreate
      await this.prisma.purchaseOrderLine.deleteMany({ where: { poId: id } });

      // Calculate totalExpectedQty in KG
      let totalExpectedQty = 0;
      for (const line of dto.lines) {
        const qty = Number(line.expectedQty) || 0;
        if (!line.uomId || !kgUom) {
          totalExpectedQty += qty;
          continue;
        }
        if (line.uomId === kgUom.id) {
          totalExpectedQty += qty;
          continue;
        }
        const conversion = await this.prisma.mdUomConversion.findFirst({
          where: { fromUomId: line.uomId, toUomId: kgUom.id },
        });
        if (conversion) {
          totalExpectedQty += qty * Number(conversion.conversionFactor);
        } else {
          totalExpectedQty += qty;
        }
      }

      const lineData = dto.lines.map((line, idx) => ({
        poId: id,
        lineNumber: idx + 1,
        itemId: line.itemId,
        uomId: line.uomId || null,
        expectedQty: line.expectedQty,
        notes: line.notes || null,
        status: 'OPEN',
      }));

      await this.prisma.purchaseOrderLine.createMany({ data: lineData as any });
      updateData.totalExpectedQty = totalExpectedQty;
    }

    return this.prisma.purchaseOrder.update({
      where: { id, rowVersion: BigInt(dto.rowVersion) },
      data: { ...updateData, rowVersion: { increment: 1 } },
      include: this.includeDetail(),
    });
  }

  async confirm(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CONFIRMED)) {
      throw new BadRequestException(`Cannot confirm PO in status ${po.status}`);
    }

    // PO confirm = chỉ đổi status, KHÔNG post M3 tại đây.
    const result = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CONFIRMED, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });

    return result;
  }

  async close(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CLOSED)) {
      throw new BadRequestException(`Cannot close PO in status ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CLOSED, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });
  }

  async cancel(id: string, dto: CancelPurchaseOrderDto, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel PO in status ${po.status}`);
    }

    const result = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PoStatus.CANCELLED,
        cancelReasonCode: dto.reasonCode || null,
        rowVersion: { increment: 1 },
        updatedBy: userId || null,
      },
      include: this.includeDetail(),
    });

    return result;
  }

  async unconfirm(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.NEW)) {
      throw new BadRequestException(`Cannot unconfirm PO in status ${po.status}`);
    }

    // Check if any receipt has been created from this PO
    const receiptsCount = await this.prisma.receiptHeader.count({
      where: { poId: po.poNumber },
    });
    if (receiptsCount > 0) {
      throw new BadRequestException('Cannot unconfirm PO that already has receipts');
    }

    const result = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.NEW, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });

    return result;
  }

  /**
   * Recalculate PO line statuses + PO header status based on actual received quantities.
   * Called after each weighing event that updates receipt lines.
   *
   * Logic:
   * 1. Aggregate receivedQty from all ReceiptLines (status=RECEIVED) grouped by itemId
   * 2. Update each PO Line:
   *    - receivedQty = sum of receipt lines for that item
   *    - status: OPEN (0%), PARTIAL (>0% && <100%), RECEIVED (>=100%)
   * 3. Update PO Header:
   *    - totalReceivedQty = sum of all PO line receivedQty
   *    - status: CONFIRMED→RECEIVING (first receipt activity), stays RECEIVING until manual close
   *
   * @param poNumber - The PO number (not UUID) as stored in receipt.poId
   * @param userId - Optional user ID for audit trail
   */
  async recalculatePOStatus(
    poNumber: string,
    userId?: string,
  ): Promise<{
    updated: boolean;
    poId?: string;
    poNumber?: string;
    fromStatus?: string;
    toStatus?: string;
    totalReceivedQty?: number;
    totalExpectedQty?: number;
    linesSummary?: Array<{ lineNumber: number; itemId: string; expectedQty: number; receivedQty: number; status: string }>;
    reason?: string;
  }> {
    if (!poNumber) {
      return { updated: false, reason: 'No poNumber provided' };
    }

    try {
      // 1. Find PO with lines
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber },
        include: {
          lines: {
            where: { status: { not: 'CANCELLED' } },
            orderBy: { lineNumber: 'asc' },
          },
        },
      });

      if (!po) {
        return { updated: false, poNumber, reason: `PO ${poNumber} not found` };
      }

      if (po.status === 'CLOSED' || po.status === 'CANCELLED') {
        return { updated: false, poId: po.id, poNumber, reason: `PO is ${po.status}, skip recalculation` };
      }

      // 2. Aggregate receivedQty from all receipt lines linked to this PO, grouped by itemId
      const receiptLines = await this.prisma.receiptLine.findMany({
        where: {
          header: { poId: poNumber },
          status: 'RECEIVED',
        },
        select: {
          itemId: true,
          receivedQty: true,
        },
      });

      // Group by itemId → total received per item
      const receivedByItem = new Map<string, number>();
      for (const rl of receiptLines) {
        const current = receivedByItem.get(rl.itemId) || 0;
        receivedByItem.set(rl.itemId, current + Number(rl.receivedQty || 0));
      }

      // 3. Update each PO line status + receivedQty
      const linesSummary: Array<{ lineNumber: number; itemId: string; expectedQty: number; receivedQty: number; status: string }> = [];
      let totalReceivedQty = 0;

      for (const poLine of po.lines) {
        const expectedQty = Number(poLine.expectedQty);
        const receivedQty = receivedByItem.get(poLine.itemId) || 0;
        totalReceivedQty += receivedQty;

        let newLineStatus: string;
        if (receivedQty <= 0) {
          newLineStatus = 'OPEN';
        } else if (receivedQty >= expectedQty) {
          newLineStatus = 'RECEIVED';
        } else {
          newLineStatus = 'PARTIAL';
        }

        // Only update if status or receivedQty changed
        if (poLine.status !== newLineStatus || Number(poLine.receivedQty) !== receivedQty) {
          await this.prisma.purchaseOrderLine.update({
            where: { id: poLine.id },
            data: {
              receivedQty,
              status: newLineStatus as any,
            },
          });
        }

        linesSummary.push({
          lineNumber: poLine.lineNumber,
          itemId: poLine.itemId,
          expectedQty,
          receivedQty,
          status: newLineStatus,
        });
      }

      // 4. Determine PO header status
      const fromStatus = po.status;
      let toStatus = fromStatus;

      const hasAnyReceived = linesSummary.some((l) => l.receivedQty > 0);
      const allLinesReceived = po.lines.length > 0 && linesSummary.every((l) => l.status === 'RECEIVED');

      if (hasAnyReceived && (fromStatus === 'CONFIRMED' || fromStatus === 'NEW')) {
        // First receiving activity → move to RECEIVING
        toStatus = 'RECEIVING';
      }

      // Note: We do NOT auto-close the PO even when all lines are RECEIVED.
      // Closing is a manual action because the operator may need to verify totals,
      // handle tolerances, or wait for documentation.

      // 5. Update PO header
      const totalExpectedQty = Number(po.totalExpectedQty);
      const updateData: any = {
        totalReceivedQty,
        rowVersion: { increment: 1 },
        updatedBy: userId || null,
      };

      if (toStatus !== fromStatus) {
        updateData.status = toStatus;
      }

      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: updateData,
      });

      this.logger.log(
        `PO ${poNumber} recalculated: status ${fromStatus}→${toStatus}, ` +
        `received ${totalReceivedQty}/${totalExpectedQty} KG, ` +
        `lines: ${linesSummary.map((l) => `#${l.lineNumber}=${l.status}`).join(', ')}`,
      );

      return {
        updated: true,
        poId: po.id,
        poNumber,
        fromStatus,
        toStatus,
        totalReceivedQty,
        totalExpectedQty,
        linesSummary,
      };
    } catch (error: any) {
      this.logger.error(`Failed to recalculate PO ${poNumber}: ${error.message}`, error.stack);
      return {
        updated: false,
        poNumber,
        reason: error.message || 'Unknown error',
      };
    }
  }

  private async reversePoConfirmedPostings(poId: string, reasonCode: string, userId?: string) {
    try {
      const reversalEngine = new ReversalEngineService(this.prisma);

      // Find all EXPECTED transactions posted for this PO
      const poTransactions = await this.prisma.inventTrans.findMany({
        where: { refId: poId, stage: 'EXPECTED', isReversal: false },
        select: { transId: true, id: true },
      });

      for (const trans of poTransactions) {
        // Check if already reversed
        const existingReversal = await this.prisma.inventoryReversalLink.findFirst({
          where: { originalTransId: trans.id },
        });
        if (existingReversal) continue;

        try {
          await reversalEngine.reverseTransaction({
            externalId: `PO-CANCEL-REV-${poId}-${trans.transId}`,
            correlationId: `corr-po-cancel-${poId}`,
            originalTransId: trans.transId,
            reasonCode,
            note: `Auto-reversal: PO ${poId} cancelled/unconfirmed`,
            reversedBy: userId,
          });
        } catch (err: any) {
          console.error(`[M4→M3] Reversal failed for trans ${trans.transId}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error(`[M4→M3] PO reversal failed for PO ${poId} (non-blocking):`, err.message);
    }
  }
}
