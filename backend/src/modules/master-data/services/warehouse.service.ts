import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from '../dto/warehouse.dto';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdWarehouse } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateWarehouseDto, ctx: RequestContext): Promise<MdWarehouse> {
    const doCreate = async () => {
      const existing = await this.warehouseRepository.findByCode(dto.warehouseCode);
      if (existing) {
        throw new ConflictException(`Warehouse code ${dto.warehouseCode} already exists`);
      }

      const result = await this.warehouseRepository.create({
        warehouseCode: dto.warehouseCode,
        warehouseName: dto.warehouseName,
        siteId: dto.siteId || 'TVL-SITE',
        warehouseType: dto.warehouseType,
        totalAreaM2: dto.totalAreaM2,
        usableAreaM2: dto.usableAreaM2,
        maxHeightM: dto.maxHeightM,
        maxCapacityMt: dto.maxCapacityMt,
        address: dto.address,
        hasWeighbridge: dto.hasWeighbridge || false,
        weighbridgeCount: dto.weighbridgeCount,
        isBonded: dto.isBonded || false,
        capacityWarningPct: dto.capacityWarningPct,
        lengthM: dto.lengthM,
        widthM: dto.widthM,
        siteXCoord: dto.siteXCoord,
        siteYCoord: dto.siteYCoord,
        siteRotationDeg: dto.siteRotationDeg,
        displayColor: dto.displayColor,
        ...(dto.ownerId ? { owner: { connect: { id: dto.ownerId } } } : {}),
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });

      await this.logService.createAuditLog({
        entityType: 'WAREHOUSE',
        entityId: result.id,
        action: 'CREATE',
        userId: ctx.userId,
        newValue: result,
      });

      return result;
    };

    return doCreate();
  }

  async findById(id: string): Promise<MdWarehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  async findMany(dto: ListWarehouseDto): Promise<PaginatedResult<MdWarehouse>> {
    return this.warehouseRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      keyword: dto.keyword,
      isActive: dto.isActive,
      warehouseType: dto.warehouseType,
    });
  }

  async update(id: string, dto: UpdateWarehouseDto, ctx: RequestContext): Promise<MdWarehouse> {
    const warehouse = await this.findById(id);
    if (!warehouse.isActive) throw new BadRequestException('Cannot update inactive warehouse');

    // HI-3: FK pre-validation
    if (dto.defaultReceivingLocationId) {
      const loc = await this.prisma.mdLocation.findUnique({ where: { id: dto.defaultReceivingLocationId } });
      if (!loc) throw new BadRequestException('Default receiving location not found');
    }
    if (dto.defaultStagingLocationId) {
      const loc = await this.prisma.mdLocation.findUnique({ where: { id: dto.defaultStagingLocationId } });
      if (!loc) throw new BadRequestException('Default staging location not found');
    }
    if (dto.defaultShippingLocationId) {
      const loc = await this.prisma.mdLocation.findUnique({ where: { id: dto.defaultShippingLocationId } });
      if (!loc) throw new BadRequestException('Default shipping location not found');
    }

    const oldValue = { ...warehouse };
    const result = await this.warehouseRepository.update(
      id,
      {
        warehouseName: dto.warehouseName,
        warehouseType: dto.warehouseType,
        totalAreaM2: dto.totalAreaM2,
        usableAreaM2: dto.usableAreaM2,
        maxHeightM: dto.maxHeightM,
        maxCapacityMt: dto.maxCapacityMt,
        address: dto.address,
        hasWeighbridge: dto.hasWeighbridge,
        weighbridgeCount: dto.weighbridgeCount,
        isBonded: dto.isBonded,
        capacityWarningPct: dto.capacityWarningPct,
        defaultReceivingLocationId: dto.defaultReceivingLocationId,
        defaultStagingLocationId: dto.defaultStagingLocationId,
        defaultShippingLocationId: dto.defaultShippingLocationId,
        lengthM: dto.lengthM,
        widthM: dto.widthM,
        siteXCoord: dto.siteXCoord,
        siteYCoord: dto.siteYCoord,
        siteRotationDeg: dto.siteRotationDeg,
        displayColor: dto.displayColor,
        ...(dto.ownerId !== undefined ? { owner: dto.ownerId ? { connect: { id: dto.ownerId } } : { disconnect: true } } : {}),
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );

    await this.logService.createAuditLog({
      entityType: 'WAREHOUSE',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdWarehouse> {
    // HI-6: Wrap in transaction to prevent race condition
    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.mdWarehouse.findUnique({ where: { id } });
      if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
      if (!warehouse.isActive) throw new BadRequestException('Warehouse is already inactive');

      const activeZoneCount = await tx.mdZone.count({ where: { warehouseId: id, isActive: true } });
      if (activeZoneCount > 0) {
        throw new BadRequestException('Cannot deactivate warehouse with active zones');
      }

      // Check on-hand inventory in this warehouse via InventDim
      // Block if any bucket > 0: physical, allocated
      const stockRecord = await tx.onHand.findFirst({
        where: {
          inventDim: { warehouseId: id },
          OR: [
            { physicalQty: { gt: 0 } },
            { allocatedQty: { gt: 0 } },
          ],
        },
      });
      if (stockRecord) {
        throw new BadRequestException(
          'Không thể vô hiệu hóa kho vì vẫn còn tồn kho hoặc đơn hàng đang xử lý tại các vị trí thuộc kho này'
        );
      }

      const result = await tx.mdWarehouse.update({
        where: { id, rowVersion: warehouse.rowVersion },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: ctx.userId,
          rowVersion: { increment: 1 },
        },
      });

      await this.logService.createAuditLog({
        entityType: 'WAREHOUSE',
        entityId: id,
        action: 'DEACTIVATE',
        userId: ctx.userId,
        oldValue: warehouse,
        newValue: result,
      });

      return result;
    });
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdWarehouse> {
    const warehouse = await this.findById(id);
    if (warehouse.isActive) throw new BadRequestException('Warehouse is already active');
    
    const result = await this.warehouseRepository.reactivate(id, ctx.userId!, warehouse.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'WAREHOUSE',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: warehouse,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdWarehouse[]> {
    return this.warehouseRepository.findAllActive();
  }
}
