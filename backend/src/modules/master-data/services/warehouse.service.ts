import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from '../dto/warehouse.dto';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdWarehouse } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  async create(dto: CreateWarehouseDto, ctx: RequestContext): Promise<MdWarehouse> {
    const existing = await this.warehouseRepository.findByCode(dto.warehouseCode);
    if (existing) {
      throw new ConflictException(`Warehouse code ${dto.warehouseCode} already exists`);
    }

    return this.warehouseRepository.create({
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
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
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

    return this.warehouseRepository.update(
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
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdWarehouse> {
    const warehouse = await this.findById(id);
    if (!warehouse.isActive) throw new BadRequestException('Warehouse is already inactive');

    const hasActiveZones = await this.warehouseRepository.hasActiveZones(id);
    if (hasActiveZones) {
      throw new BadRequestException('Cannot deactivate warehouse with active zones');
    }

    return this.warehouseRepository.deactivate(id, ctx.userId!, warehouse.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdWarehouse> {
    const warehouse = await this.findById(id);
    if (warehouse.isActive) throw new BadRequestException('Warehouse is already active');
    return this.warehouseRepository.reactivate(id, ctx.userId!, warehouse.rowVersion);
  }

  async findAllActive(): Promise<MdWarehouse[]> {
    return this.warehouseRepository.findAllActive();
  }
}
