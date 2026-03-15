import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateReceiptDto, UpdateReceiptDto, ConfirmReceiptDto, CancelReceiptDto, WeighInDto, WeighOutDto, ReceiptQueryDto } from '../dto/receipt.dto';

// Import JS modules
const { ReceiptService: LegacyReceiptService } = require('../application/receipt.service');
const { ReceiptRepository } = require('../infra/receipt.repository');
const { InboundError } = require('../domain/inbound.errors');

// Helper to validate UUID
const isValidUUID = (str: string | null | undefined): boolean => 
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

@Injectable()
export class ReceiptService {
  private legacyService: any;
  private receiptRepo: any;

  constructor(private readonly prisma: PrismaService) {
    this.legacyService = new LegacyReceiptService(prisma);
    this.receiptRepo = new ReceiptRepository(prisma);
  }

  private resolveUserId(userId: string | null | undefined): string | null {
    return userId && isValidUUID(userId) ? userId : null;
  }

  async createReceipt(dto: CreateReceiptDto, userId: string) {
    try {
      // Transform frontend payload to legacy service format
      const externalId = dto.externalId || `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const poId = dto.poId || dto.poNumber || '';
      const asnId = dto.asnId || dto.asnNumber || null;
      
      // Build lines array if not provided (frontend sends flat structure)
      let lines = dto.lines;
      if (!lines || lines.length === 0) {
        if (dto.itemId) {
          // Get default UOM for item
          const item = await this.prisma.mdItem.findUnique({
            where: { id: dto.itemId },
            select: { baseUomId: true },
          });
          lines = [{
            itemId: dto.itemId,
            uomId: item?.baseUomId || dto.itemId, // fallback
            expectedQty: dto.expectedQty,
            bagCount: dto.bagCount,
            cargoForm: dto.cargoForm || 'BULK' as any,
          }];
        } else {
          throw new BadRequestException('itemId hoặc lines là bắt buộc');
        }
      }

      const payload = {
        externalId,
        receiptType: dto.receiptType || 'STANDARD',
        poId,
        asnId,
        ownerId: dto.ownerId,
        vendorId: dto.vendorId,
        warehouseId: dto.warehouseId,
        vehicleNumber: dto.vehicleNumber,
        blNumber: dto.blNumber || null,
        expectedQty: dto.expectedQty,
        notes: dto.notes || null,
        sourceApp: dto.sourceApp || 'WEB',
        lines,
      };

      // userId must be UUID or null - 'system' is not valid UUID
      const resolvedUserId = this.resolveUserId(userId) || this.resolveUserId(dto.createdBy);
      
      const context = { 
        userId: resolvedUserId, 
        correlationId: dto.correlationId || `corr-${Date.now()}` 
      };
      const result = await this.legacyService.createReceipt(payload, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async listReceipts(query: ReceiptQueryDto) {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filter } = query;
    const result = await this.receiptRepo.findMany(filter, { 
      page, 
      limit: pageSize, 
      sortBy, 
      sortOrder 
    });
    return result;
  }

  async getReceipt(id: string) {
    try {
      const receipt = await this.legacyService.getReceipt(id);
      return receipt;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getReceiptHistory(id: string) {
    try {
      const history = await this.legacyService.getReceiptHistory(id);
      return history;
    } catch (error) {
      this.handleError(error);
    }
  }

  async confirmReceipt(id: string, dto: ConfirmReceiptDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.confirmReceipt(id, dto, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelReceipt(id: string, dto: CancelReceiptDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.cancelReceipt(id, dto, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async reweighReceipt(id: string, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.reweighReceipt(id, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async closeReceipt(id: string, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.closeReceipt(id, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async startProcessing(id: string, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.startProcessing(id, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async receiveWeighIn(dto: WeighInDto, userId: string) {
    try {
      const { receiptId, grossWeightKg, ...rest } = dto;
      
      // Validate grossWeightKg is provided and valid
      const weight = Number(grossWeightKg);
      if (!grossWeightKg || isNaN(weight) || weight <= 0) {
        throw new BadRequestException('grossWeightKg phải là số dương');
      }
      
      const data = {
        ...rest,
        grossWeightKg: weight,
        eventTimestamp: rest.eventTimestamp || new Date().toISOString(),
      };
      
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.receiveWeighIn(receiptId, data, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async receiveWeighOut(dto: WeighOutDto, userId: string) {
    try {
      const { receiptId, tareWeightKg, ...rest } = dto;
      
      // Validate tareWeightKg is provided and valid
      const weight = Number(tareWeightKg);
      if (!tareWeightKg || isNaN(weight) || weight <= 0) {
        throw new BadRequestException('tareWeightKg phải là số dương');
      }
      
      const data = {
        ...rest,
        tareWeightKg: weight,
        eventTimestamp: rest.eventTimestamp || new Date().toISOString(),
      };
      
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      const result = await this.legacyService.receiveWeighOut(receiptId, data, context);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDashboardSummary(warehouseId?: string) {
    const statusCounts = await this.receiptRepo.countByStatus(warehouseId);
    return {
      statusCounts,
      totalActive: Object.entries(statusCounts)
        .filter(([status]) => !['CLOSED', 'CANCELLED'].includes(status))
        .reduce((sum, [, count]) => sum + (count as number), 0),
    };
  }

  async applyManualWeight(id: string, dto: any, userId: string) {
    try {
      const resolvedUserId = this.resolveUserId(userId);
      
      // Get current receipt
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id },
        include: { lines: true },
      });
      
      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} không tồn tại`);
      }

      const grossWeightKg = Number(dto.grossWeightKg) || 0;
      const tareWeightKg = Number(dto.tareWeightKg) || 0;
      const netWeightKg = grossWeightKg - tareWeightKg;

      // Update receipt with manual weights
      const updated = await this.prisma.receiptHeader.update({
        where: { id },
        data: {
          grossWeightKg,
          tareWeightKg,
          netWeightKg,
          isManualEntry: true,
          manualEntryReasonCode: dto.reasonCode || 'WB_FALLBACK',
          status: 'WEIGHED_OUT',
          updatedBy: resolvedUserId,
        },
        include: { lines: true },
      });

      // Log status history
      await this.prisma.receiptStatusHistory.create({
        data: {
          receiptHeaderId: id,
          fromStatus: receipt.status,
          toStatus: 'WEIGHED_OUT',
          transitionCode: 'MANUAL_WEIGHT',
          triggeredBy: resolvedUserId,
          note: dto.note || 'Manual weight applied',
          correlationId: `corr-${Date.now()}`,
        },
      });

      return { data: updated };
    } catch (error) {
      this.handleError(error);
    }
  }

  async putawayComplete(id: string, dto: any, userId: string) {
    try {
      const resolvedUserId = this.resolveUserId(userId);
      
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id },
        include: { lines: true },
      });
      
      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} không tồn tại`);
      }

      if (receipt.status !== 'RECEIVED') {
        throw new BadRequestException(`Không thể thực hiện action 'putawayComplete' khi receipt đang ở trạng thái '${receipt.status}'. Cần ở trạng thái: RECEIVED`);
      }

      const updated = await this.prisma.receiptHeader.update({
        where: { id },
        data: {
          status: 'PUTAWAY',
          putawayWorkId: dto.putawayWorkId || `PW-${Date.now()}`,
          updatedBy: resolvedUserId,
        },
        include: { lines: true },
      });

      await this.prisma.receiptStatusHistory.create({
        data: {
          receiptHeaderId: id,
          fromStatus: receipt.status,
          toStatus: 'PUTAWAY',
          transitionCode: 'PUTAWAY_COMPLETE',
          triggeredBy: resolvedUserId,
          note: dto.note || 'Putaway completed',
          correlationId: `corr-${Date.now()}`,
        },
      });

      return { data: updated };
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateReceipt(id: string, dto: UpdateReceiptDto, userId: string) {
    try {
      // Get current receipt
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} not found`);
      }

      // Only allow update for DRAFT status
      if (receipt.status !== 'DRAFT') {
        throw new BadRequestException('Chỉ có thể chỉnh sửa phiếu nhập ở trạng thái Tạo mới');
      }

      const resolvedUserId = this.resolveUserId(userId);

      // Update receipt header
      const updateData: any = {
        updatedBy: resolvedUserId,
      };

      if (dto.warehouseId) {
        updateData.warehouse = { connect: { id: dto.warehouseId } };
      }
      if (dto.vehicleNumber !== undefined) {
        updateData.vehicleNumber = dto.vehicleNumber;
      }
      if (dto.expectedQty !== undefined) {
        updateData.expectedQty = dto.expectedQty;
      }
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      // Update lines if provided
      if (dto.lines && dto.lines.length > 0) {
        // Delete existing lines and create new ones
        await this.prisma.receiptLine.deleteMany({
          where: { receiptHeaderId: id },
        });

        await this.prisma.receiptLine.createMany({
          data: dto.lines.map((line, index) => ({
            receiptHeaderId: id,
            itemId: line.itemId,
            uomId: line.uomId,
            expectedQty: line.expectedQty,
            cargoForm: line.cargoForm || 'BULK',
            notes: line.notes || null,
            lineNumber: index + 1,
          })),
        });
      }

      const updated = await this.prisma.receiptHeader.update({
        where: { id },
        data: updateData,
        include: { lines: true },
      });

      return { data: updated };
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteReceipt(id: string, userId: string) {
    try {
      // Get current receipt
      const receipt = await this.prisma.receiptHeader.findUnique({
        where: { id },
      });

      if (!receipt) {
        throw new NotFoundException(`Receipt ${id} not found`);
      }

      // Only allow delete for DRAFT status
      if (receipt.status !== 'DRAFT') {
        throw new BadRequestException('Chỉ có thể xóa phiếu nhập ở trạng thái Tạo mới');
      }

      // Delete related records first
      await this.prisma.$transaction(async (tx) => {
        // Delete lines
        await tx.receiptLine.deleteMany({
          where: { receiptHeaderId: id },
        });

        // Delete status history
        await tx.receiptStatusHistory.deleteMany({
          where: { receiptHeaderId: id },
        });

        // Delete weighing logs if any
        await tx.receiptWeighingLog.deleteMany({
          where: { receiptHeaderId: id },
        });

        // Delete exception logs if any
        await tx.receiptExceptionLog.deleteMany({
          where: { receiptHeaderId: id },
        });

        // Delete integration states if any
        await tx.receiptIntegrationState.deleteMany({
          where: { receiptHeaderId: id },
        });

        // Delete receipt header
        await tx.receiptHeader.delete({
          where: { id },
        });
      });

      return { message: 'Đã xóa phiếu nhập thành công' };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (error instanceof InboundError) {
      if (error.httpStatus === 404) {
        throw new NotFoundException(error.message);
      }
      if (error.httpStatus === 409) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
