import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ZoneRepository } from '../repositories/zone.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateZoneDto, UpdateZoneDto, ListZoneDto } from '../dto/zone.dto';
import { MdZone } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

export { CreateZoneDto, UpdateZoneDto, ListZoneDto };

@Injectable()
export class ZoneService {
  constructor(
    private readonly zoneRepository: ZoneRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateZoneDto, ctx: RequestContext): Promise<MdZone> {
    const doCreate = async () => {
      // HI-3: FK pre-validation
      const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse) throw new BadRequestException('Warehouse not found');

      const existing = await this.zoneRepository.findByWarehouseAndCode(dto.warehouseId, dto.zoneCode);
      if (existing) throw new ConflictException(`Zone code ${dto.zoneCode} already exists in warehouse`);

      const result = await this.zoneRepository.create({
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

      await this.logService.createAuditLog({
        entityType: 'ZONE',
        entityId: result.id,
        action: 'CREATE',
        userId: ctx.userId,
        newValue: result,
      });

      return result;
    };

    if (dto.externalId) {
      return this.idempotencyService.executeWithIdempotency(`ZONE:${dto.externalId}`, doCreate);
    }
    return doCreate();
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

    const oldValue = { ...zone };
    const result = await this.zoneRepository.update(id, {
      zoneName: dto.zoneName,
      zoneType: dto.zoneType,
      isBillingZone: dto.isBillingZone,
      billingRateZone: dto.billingRateZone,
      maxCapacityMt: dto.maxCapacityMt,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'ZONE',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdZone> {
    // HI-6: Wrap in transaction to prevent race condition
    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.mdZone.findUnique({ where: { id } });
      if (!zone) throw new NotFoundException(`Zone ${id} not found`);
      if (!zone.isActive) throw new BadRequestException('Zone is already inactive');

      const activeLocationCount = await tx.mdLocation.count({ where: { zoneId: id, isActive: true } });
      if (activeLocationCount > 0) {
        throw new BadRequestException('Cannot deactivate zone with active locations');
      }

      const result = await tx.mdZone.update({
        where: { id, rowVersion: zone.rowVersion },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: ctx.userId,
          rowVersion: { increment: 1 },
        },
      });

      await this.logService.createAuditLog({
        entityType: 'ZONE',
        entityId: id,
        action: 'DEACTIVATE',
        userId: ctx.userId,
        oldValue: zone,
        newValue: result,
      });

      return result;
    });
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdZone> {
    const zone = await this.findById(id);
    if (zone.isActive) throw new BadRequestException('Zone is already active');
    
    const result = await this.zoneRepository.reactivate(id, ctx.userId!, zone.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'ZONE',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: zone,
      newValue: result,
    });

    return result;
  }

  async findByWarehouse(warehouseId: string): Promise<MdZone[]> {
    return this.zoneRepository.findByWarehouse(warehouseId);
  }
}
