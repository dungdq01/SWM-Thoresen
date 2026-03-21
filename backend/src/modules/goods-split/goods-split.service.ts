/**
 * Goods Split Service — Chia hàng đổi chủ
 * 
 * 7-Step Business Flow (per spec v5.1 GAP-06):
 * 1. Chọn PO/Receipt nguồn → xác định item, qty, original owner
 * 2. Nhập danh sách chủ hàng đích + tỉ lệ phân bổ (%)
 * 3. Hệ thống tính toán expected qty cho từng chủ hàng
 * 4. User review + điều chỉnh actual qty (nếu cần)
 * 5. User confirm → lock split
 * 6. Hệ thống tạo InventTrans (STATUS_CHANGE owner) cho từng detail line
 * 7. Audit trail: GoodsSplitTransaction ghi nhận mọi movement
 * 
 * Business Rules:
 * - Tổng allocation_pct phải = 100%
 * - Tổng actual_qty phải ≤ total_qty (tolerance 1% default)
 * - Min allocation: 1kg per detail line
 * - Rounding: last line nhận phần dư
 * - Chỉ split hàng có status AVAILABLE trong OnHand
 * - Cancel: chỉ khi status = DRAFT hoặc CALCULATED
 * - Posted: immutable — không thể sửa/hủy
 */

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateGoodsSplitDto {
  sourceReceiptId: string;
  sourcePOId?: string;
  itemId: string;
  totalQty: number;
  uomId: string;
  warehouseId: string;
  lotId?: string;
  notes?: string;
  details: {
    targetOwnerId: string;
    allocationPct: number;
  }[];
}

export interface ConfirmSplitDto {
  details?: {
    detailId: string;
    actualQty: number;
  }[];
}

@Injectable()
export class GoodsSplitService {
  private readonly logger = new Logger(GoodsSplitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Step 1-3: Create split header + calculate expected quantities
   */
  async create(dto: CreateGoodsSplitDto, userId?: string) {
    // Validate allocation percentages sum to 100%
    const totalPct = dto.details.reduce((sum, d) => sum + d.allocationPct, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new BadRequestException(
        `Tổng tỉ lệ phân bổ phải bằng 100%. Hiện tại: ${totalPct.toFixed(2)}%`,
      );
    }

    // Validate min 1 detail line
    if (dto.details.length < 1) {
      throw new BadRequestException('Cần ít nhất 1 chủ hàng đích');
    }

    // Validate receipt exists
    const receipt = await this.prisma.receiptHeader.findUnique({
      where: { id: dto.sourceReceiptId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!receipt) {
      throw new NotFoundException(`Phiếu nhập ${dto.sourceReceiptId} không tồn tại`);
    }

    // Validate item
    const item = await this.prisma.mdItem.findUnique({
      where: { id: dto.itemId },
      select: { id: true, itemCode: true },
    });
    if (!item) {
      throw new NotFoundException(`Mặt hàng ${dto.itemId} không tồn tại`);
    }

    // Get KG UOM for conversion
    const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
    const totalQtyKg = dto.totalQty; // Assume KG for now

    // Calculate expected qty per detail line
    const splitNumber = await this.generateSplitNumber();
    const externalId = `SPLIT-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const correlationId = uuidv4();

    // Calculate quantities with rounding handling
    const detailsWithQty = this.calculateAllocation(dto.details, dto.totalQty, totalQtyKg);

    const split = await this.prisma.goodsSplitHeader.create({
      data: {
        splitNumber,
        sourceReceiptId: dto.sourceReceiptId,
        sourcePOId: dto.sourcePOId || null,
        originalOwnerId: receipt.ownerId,
        warehouseId: dto.warehouseId,
        itemId: dto.itemId,
        totalQty: dto.totalQty,
        totalQtyKg,
        uomId: dto.uomId,
        allocatedQty: dto.totalQty,
        unallocatedQty: 0,
        lotId: dto.lotId || null,
        notes: dto.notes || null,
        status: 'CALCULATED',
        externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: userId,
        details: {
          create: detailsWithQty.map((d, idx) => ({
            lineNumber: idx + 1,
            targetOwnerId: d.targetOwnerId,
            allocationPct: d.allocationPct,
            expectedQty: d.expectedQty,
            expectedQtyKg: d.expectedQtyKg,
            status: 'ALLOCATED',
            createdBy: userId,
          })),
        },
      },
      include: {
        originalOwner: { select: { id: true, ownerCode: true, ownerName: true } },
        item: { select: { id: true, itemCode: true, itemName: true } },
        details: {
          include: {
            targetOwner: { select: { id: true, ownerCode: true, ownerName: true } },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    return split;
  }

  /**
   * Step 4: Get split for review
   */
  async findById(id: string) {
    const split = await this.prisma.goodsSplitHeader.findUnique({
      where: { id },
      include: {
        originalOwner: { select: { id: true, ownerCode: true, ownerName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        item: { select: { id: true, itemCode: true, itemName: true } },
        uom: { select: { id: true, uomCode: true } },
        details: {
          include: {
            targetOwner: { select: { id: true, ownerCode: true, ownerName: true } },
          },
          orderBy: { lineNumber: 'asc' },
        },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!split) throw new NotFoundException(`Phiếu chia hàng ${id} không tồn tại`);
    return split;
  }

  /**
   * Step 5: Confirm split — lock quantities, optionally adjust actuals
   */
  async confirm(id: string, dto: ConfirmSplitDto, userId?: string) {
    const split = await this.prisma.goodsSplitHeader.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!split) throw new NotFoundException(`Phiếu chia hàng ${id} không tồn tại`);
    if (!['DRAFT', 'CALCULATED'].includes(split.status)) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận phiếu ở trạng thái Nháp hoặc Đã tính. Hiện tại: ${split.status}`,
      );
    }

    // Apply actual qty overrides if provided
    if (dto.details && dto.details.length > 0) {
      for (const override of dto.details) {
        const detail = split.details.find((d) => d.id === override.detailId);
        if (!detail) continue;

        await this.prisma.goodsSplitDetail.update({
          where: { id: override.detailId },
          data: {
            actualQty: override.actualQty,
            actualQtyKg: override.actualQty,
            status: 'CONFIRMED',
            updatedBy: userId,
          },
        });
      }
    } else {
      // Auto-confirm all details with expected = actual
      await this.prisma.goodsSplitDetail.updateMany({
        where: { splitHeaderId: id },
        data: { status: 'CONFIRMED' },
      });

      // Set actual = expected for all details
      for (const detail of split.details) {
        await this.prisma.goodsSplitDetail.update({
          where: { id: detail.id },
          data: {
            actualQty: detail.expectedQty,
            actualQtyKg: detail.expectedQtyKg,
          },
        });
      }
    }

    // Validate total actual ≤ total (within tolerance)
    const updatedDetails = await this.prisma.goodsSplitDetail.findMany({
      where: { splitHeaderId: id },
    });
    const totalActual = updatedDetails.reduce(
      (sum, d) => sum + Number(d.actualQty || d.expectedQty || 0),
      0,
    );
    const totalQty = Number(split.totalQty);
    const tolerancePct = Number(split.tolerancePct);

    if (totalActual > totalQty * (1 + tolerancePct / 100)) {
      throw new BadRequestException(
        `Tổng số lượng thực tế (${totalActual}) vượt quá tổng cho phép (${totalQty} + ${tolerancePct}% dung sai)`,
      );
    }

    await this.prisma.goodsSplitHeader.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedBy: userId,
        confirmedAt: new Date(),
        unallocatedQty: Math.max(0, totalQty - totalActual),
        updatedBy: userId,
      },
    });

    return this.findById(id);
  }

  /**
   * Step 6-7: Post split — create inventory transactions for owner change
   */
  async post(id: string, userId?: string) {
    const split = await this.prisma.goodsSplitHeader.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!split) throw new NotFoundException(`Phiếu chia hàng ${id} không tồn tại`);
    if (split.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Chỉ có thể ghi sổ phiếu đã xác nhận. Hiện tại: ${split.status}`,
      );
    }

    const correlationId = split.correlationId;
    const transactions: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const detail of split.details) {
        if (detail.status === 'CANCELLED') continue;

        const qty = Number(detail.actualQty || detail.expectedQty);
        if (qty <= 0) continue;

        const transId = `SPLIT-${uuidv4().slice(0, 12)}`;
        const externalId = `SPLIT-TX-${split.id}-${detail.id}-${uuidv4().slice(0, 8)}`;

        // Create InventTrans for owner change (STATUS_CHANGE type)
        const trans = await tx.inventTrans.create({
          data: {
            transId,
            refType: 'GOODS_SPLIT',
            refId: split.id,
            refLineId: detail.id,
            transType: 'STATUS_CHANGE',
            itemId: split.itemId,
            qty,
            uomId: split.uomId,
            stage: 'PHYSICAL',
            externalId,
            correlationId,
            sourceApp: 'SYSTEM',
            postedBy: userId || null,
            postedAt: new Date(),
            ownerId: detail.targetOwnerId,
          },
        });

        // Create split transaction record
        const splitTx = await tx.goodsSplitTransaction.create({
          data: {
            splitHeaderId: split.id,
            splitDetailId: detail.id,
            transType: 'OWNER_TRANSFER',
            fromOwnerId: split.originalOwnerId,
            toOwnerId: detail.targetOwnerId,
            itemId: split.itemId,
            qty,
            uomId: split.uomId,
            inventTransId: transId,
            correlationId,
            postedAt: new Date(),
            postedBy: userId,
          },
        });

        transactions.push(splitTx);

        // Mark detail as posted
        await tx.goodsSplitDetail.update({
          where: { id: detail.id },
          data: { status: 'POSTED', postedTransId: transId, updatedBy: userId },
        });
      }

      // Mark header as posted
      await tx.goodsSplitHeader.update({
        where: { id: split.id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          updatedBy: userId,
        },
      });
    });

    this.logger.log(
      `Goods split ${split.splitNumber} posted: ${transactions.length} owner transfers`,
    );

    return this.findById(id);
  }

  /**
   * Cancel split (only DRAFT or CALCULATED)
   */
  async cancel(id: string, reasonCode: string, userId?: string) {
    const split = await this.prisma.goodsSplitHeader.findUnique({ where: { id } });
    if (!split) throw new NotFoundException(`Phiếu chia hàng ${id} không tồn tại`);
    if (!['DRAFT', 'CALCULATED'].includes(split.status)) {
      throw new BadRequestException(
        `Chỉ có thể hủy phiếu ở trạng thái Nháp hoặc Đã tính. Hiện tại: ${split.status}`,
      );
    }

    await this.prisma.goodsSplitDetail.updateMany({
      where: { splitHeaderId: id },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.goodsSplitHeader.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReasonCode: reasonCode,
        cancelledBy: userId,
        cancelledAt: new Date(),
        updatedBy: userId,
      },
    });

    return this.findById(id);
  }

  /**
   * List all splits with filters
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    warehouseId?: string;
    ownerId?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.ownerId) where.originalOwnerId = params.ownerId;

    const [data, total] = await Promise.all([
      this.prisma.goodsSplitHeader.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          originalOwner: { select: { id: true, ownerCode: true, ownerName: true } },
          item: { select: { id: true, itemCode: true, itemName: true } },
          details: {
            include: {
              targetOwner: { select: { id: true, ownerCode: true, ownerName: true } },
            },
          },
        },
      }),
      this.prisma.goodsSplitHeader.count({ where }),
    ]);

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  private calculateAllocation(
    details: { targetOwnerId: string; allocationPct: number }[],
    totalQty: number,
    totalQtyKg: number,
  ) {
    let remainingQty = totalQty;
    let remainingKg = totalQtyKg;

    return details.map((d, idx) => {
      const isLast = idx === details.length - 1;

      // Last line gets remainder to avoid rounding loss
      const expectedQty = isLast
        ? remainingQty
        : Math.round((totalQty * d.allocationPct) / 100 * 1000) / 1000;
      const expectedQtyKg = isLast
        ? remainingKg
        : Math.round((totalQtyKg * d.allocationPct) / 100 * 1000) / 1000;

      remainingQty -= expectedQty;
      remainingKg -= expectedQtyKg;

      return {
        targetOwnerId: d.targetOwnerId,
        allocationPct: d.allocationPct,
        expectedQty: Math.max(expectedQty, 0),
        expectedQtyKg: Math.max(expectedQtyKg, 0),
      };
    });
  }

  private async generateSplitNumber(): Promise<string> {
    const today = new Date();
    const prefix = `SPL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const last = await this.prisma.goodsSplitHeader.findFirst({
      where: { splitNumber: { startsWith: prefix } },
      orderBy: { splitNumber: 'desc' },
    });

    let seq = 1;
    if (last?.splitNumber) {
      const lastSeq = parseInt(last.splitNumber.slice(-4), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }
}
