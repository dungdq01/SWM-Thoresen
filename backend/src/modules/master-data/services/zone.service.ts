import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ZoneRepository } from '../repositories/zone.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateZoneDto, UpdateZoneDto, ListZoneDto } from '../dto/zone.dto';
import { MdZone } from '@prisma/client';

export { CreateZoneDto, UpdateZoneDto, ListZoneDto };

@Injectable()
export class ZoneService {
  constructor(private readonly zoneRepository: ZoneRepository) {}

  async create(dto: CreateZoneDto, ctx: RequestContext): Promise<MdZone> {
    const existing = await this.zoneRepository.findByWarehouseAndCode(dto.warehouseId, dto.zoneCode);
    if (existing) throw new ConflictException(`Zone code ${dto.zoneCode} already exists in warehouse`);

    return this.zoneRepository.create({
      warehouse: { connect: { id: dto.warehouseId } },
      zoneCode: dto.zoneCode,
      zoneName: dto.zoneName,
      zoneType: dto.zoneType,
      isBillingZone: dto.isBillingZone || false,
      billingRateZone: dto.billingRateZone,
      maxCapacityMt: dto.maxCapacityMt,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdZone> {
    const zone = await this.zoneRepository.findById(id);
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  async findMany(dto: ListZoneDto): Promise<PaginatedResult<MdZone>> {
    return this.zoneRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateZoneDto, ctx: RequestContext): Promise<MdZone> {
    const zone = await this.findById(id);
    if (!zone.isActive) throw new BadRequestException('Cannot update inactive zone');

    return this.zoneRepository.update(id, {
      zoneName: dto.zoneName,
      zoneType: dto.zoneType,
      isBillingZone: dto.isBillingZone,
      billingRateZone: dto.billingRateZone,
      maxCapacityMt: dto.maxCapacityMt,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdZone> {
    const zone = await this.findById(id);
    if (!zone.isActive) throw new BadRequestException('Zone is already inactive');

    const hasActiveLocations = await this.zoneRepository.hasActiveLocations(id);
    if (hasActiveLocations) throw new BadRequestException('Cannot deactivate zone with active locations');

    return this.zoneRepository.deactivate(id, ctx.userId!, zone.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdZone> {
    const zone = await this.findById(id);
    if (zone.isActive) throw new BadRequestException('Zone is already active');
    return this.zoneRepository.reactivate(id, ctx.userId!, zone.rowVersion);
  }

  async findByWarehouse(warehouseId: string): Promise<MdZone[]> {
    return this.zoneRepository.findByWarehouse(warehouseId);
  }
}
