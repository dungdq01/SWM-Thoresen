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
    // FK pre-validation
    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new BadRequestException('Warehouse not found');
    const zone = await this.prisma.mdZone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new BadRequestException('Zone not found');
    if (zone.warehouseId !== dto.warehouseId) throw new BadRequestException('Zone does not belong to the specified warehouse');

    const existing = await this.locationRepository.findByWarehouseAndCode(dto.warehouseId, dto.locationCode);
    if (existing) throw new ConflictException(`Location code ${dto.locationCode} already exists in warehouse`);

    const result = await this.locationRepository.create({
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
      doorConfig: dto.doorConfig,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'LOCATION',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
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

    const oldValue = { ...location };
    const result = await this.locationRepository.update(id, {
      locationType: dto.locationType,
      locationProfile: dto.locationProfile,
      status: dto.status,
      areaM2: dto.areaM2,
      maxHeightM: dto.maxHeightM,
      stackLimitKg: dto.stackLimitKg,
      locationWidthM: dto.locationWidthM,
      locationDepthM: dto.locationDepthM,
      isMixedOwner: dto.isMixedOwner,
      isMixedProduct: dto.isMixedProduct,
      isBillingLocation: dto.isBillingLocation,
      stackingRule: dto.stackingRule,
      xCoord: dto.xCoord,
      yCoord: dto.yCoord,
      rotationDeg: dto.rotationDeg,
      displayColor: dto.displayColor,
      doorConfig: dto.doorConfig,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'LOCATION',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdLocation> {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.mdLocation.findUnique({ where: { id } });
      if (!location) throw new NotFoundException(`Location ${id} not found`);
      if (!location.isActive) throw new BadRequestException('Location is already inactive');

      // Check on-hand inventory at this location via InventDim
      // Block if any bucket > 0: physical, allocated
      const stockRecord = await tx.onHand.findFirst({
        where: {
          inventDim: { locationId: id },
          OR: [
            { physicalQty: { gt: 0 } },
            { allocatedQty: { gt: 0 } },
          ],
        },
      });
      if (stockRecord) {
        throw new BadRequestException(
          'Không thể vô hiệu hóa vị trí vì vẫn còn tồn kho hoặc đơn hàng đang xử lý tại vị trí này'
        );
      }

      const result = await tx.mdLocation.update({
        where: { id, rowVersion: location.rowVersion },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: ctx.userId,
          rowVersion: { increment: 1 },
        },
      });

      await this.logService.createAuditLog({
        entityType: 'LOCATION',
        entityId: id,
        action: 'DEACTIVATE',
        userId: ctx.userId,
        oldValue: location,
        newValue: result,
      });

      return result;
    });
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdLocation> {
    const location = await this.findById(id);
    if (location.isActive) throw new BadRequestException('Location is already active');
    const result = await this.locationRepository.reactivate(id, ctx.userId!, location.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'LOCATION',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: location,
      newValue: result,
    });

    return result;
  }

  async findByWarehouse(warehouseId: string): Promise<MdLocation[]> {
    return this.locationRepository.findByWarehouse(warehouseId);
  }

  async findByZone(zoneId: string): Promise<MdLocation[]> {
    return this.locationRepository.findByZone(zoneId);
  }
}
