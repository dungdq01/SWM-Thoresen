import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { LocationRepository } from '../repositories/location.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateLocationDto, UpdateLocationDto, ListLocationDto } from '../dto/location.dto';
import { MdLocation, LocationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

export { CreateLocationDto, UpdateLocationDto, ListLocationDto };

@Injectable()
export class LocationService {
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateLocationDto, ctx: RequestContext): Promise<MdLocation> {
    const existing = await this.locationRepository.findByWarehouseAndCode(dto.warehouseId, dto.locationCode);
    if (existing) throw new ConflictException(`Location code ${dto.locationCode} already exists in warehouse`);

    return this.locationRepository.create({
      warehouse: { connect: { id: dto.warehouseId } },
      zone: { connect: { id: dto.zoneId } },
      locationCode: dto.locationCode,
      locationType: dto.locationType,
      locationProfile: dto.locationProfile,
      status: dto.status || LocationStatus.OK,
      areaM2: dto.areaM2,
      maxHeightM: dto.maxHeightM,
      stackLimitKg: dto.stackLimitKg,
      isMixedOwner: dto.isMixedOwner || false,
      isMixedProduct: dto.isMixedProduct || false,
      isBillingLocation: dto.isBillingLocation || false,
      stackingRule: dto.stackingRule,
      xCoord: dto.xCoord,
      yCoord: dto.yCoord,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdLocation> {
    const location = await this.locationRepository.findById(id);
    if (!location) throw new NotFoundException(`Location ${id} not found`);
    return location;
  }

  async findMany(dto: ListLocationDto): Promise<PaginatedResult<MdLocation>> {
    return this.locationRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateLocationDto, ctx: RequestContext): Promise<MdLocation> {
    const location = await this.findById(id);
    if (!location.isActive) throw new BadRequestException('Cannot update inactive location');

    return this.locationRepository.update(id, {
      locationType: dto.locationType,
      locationProfile: dto.locationProfile,
      status: dto.status,
      areaM2: dto.areaM2,
      maxHeightM: dto.maxHeightM,
      stackLimitKg: dto.stackLimitKg,
      isMixedOwner: dto.isMixedOwner,
      isMixedProduct: dto.isMixedProduct,
      isBillingLocation: dto.isBillingLocation,
      stackingRule: dto.stackingRule,
      xCoord: dto.xCoord,
      yCoord: dto.yCoord,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdLocation> {
    const location = await this.findById(id);
    if (!location.isActive) throw new BadRequestException('Location is already inactive');
    return this.locationRepository.deactivate(id, ctx.userId!, location.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdLocation> {
    const location = await this.findById(id);
    if (location.isActive) throw new BadRequestException('Location is already active');
    return this.locationRepository.reactivate(id, ctx.userId!, location.rowVersion);
  }

  async findByWarehouse(warehouseId: string): Promise<MdLocation[]> {
    return this.locationRepository.findByWarehouse(warehouseId);
  }

  async findByZone(zoneId: string): Promise<MdLocation[]> {
    return this.locationRepository.findByZone(zoneId);
  }
}
