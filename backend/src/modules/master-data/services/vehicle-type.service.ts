import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VehicleTypeRepository } from '../repositories/vehicle-type.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto } from '../dto/vehicle-type.dto';
import { MdVehicleType } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

export { CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto };

@Injectable()
export class VehicleTypeService {
  constructor(
    private readonly vehicleTypeRepository: VehicleTypeRepository,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateVehicleTypeDto, ctx: RequestContext): Promise<MdVehicleType> {
    const existing = await this.vehicleTypeRepository.findByCode(dto.vehicleTypeCode);
    if (existing) throw new ConflictException(`Vehicle type code ${dto.vehicleTypeCode} already exists`);

    const result = await this.vehicleTypeRepository.create({
      vehicleTypeCode: dto.vehicleTypeCode,
      vehicleTypeName: dto.vehicleTypeName,
      category: dto.category,
      defaultTareWeightKg: dto.defaultTareWeightKg,
      maxPayloadKg: dto.maxPayloadKg,
      teuEquivalent: dto.teuEquivalent,
      handlingFeeGroup: dto.handlingFeeGroup,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'VEHICLE_TYPE',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async findById(id: string): Promise<MdVehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findById(id);
    if (!vehicleType) throw new NotFoundException(`Vehicle type ${id} not found`);
    return vehicleType;
  }

  async findMany(dto: ListVehicleTypeDto): Promise<PaginatedResult<MdVehicleType>> {
    return this.vehicleTypeRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateVehicleTypeDto, ctx: RequestContext): Promise<MdVehicleType> {
    const vehicleType = await this.findById(id);
    if (!vehicleType.isActive) throw new BadRequestException('Cannot update inactive vehicle type');

    const oldValue = { ...vehicleType };
    const result = await this.vehicleTypeRepository.update(id, {
      vehicleTypeName: dto.vehicleTypeName,
      category: dto.category,
      defaultTareWeightKg: dto.defaultTareWeightKg,
      maxPayloadKg: dto.maxPayloadKg,
      teuEquivalent: dto.teuEquivalent,
      handlingFeeGroup: dto.handlingFeeGroup,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'VEHICLE_TYPE',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdVehicleType> {
    const vehicleType = await this.findById(id);
    if (!vehicleType.isActive) throw new BadRequestException('Vehicle type is already inactive');
    const result = await this.vehicleTypeRepository.deactivate(id, ctx.userId!, vehicleType.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'VEHICLE_TYPE',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: vehicleType,
      newValue: result,
    });

    return result;
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdVehicleType> {
    const vehicleType = await this.findById(id);
    if (vehicleType.isActive) throw new BadRequestException('Vehicle type is already active');
    const result = await this.vehicleTypeRepository.reactivate(id, ctx.userId!, vehicleType.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'VEHICLE_TYPE',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: vehicleType,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdVehicleType[]> {
    return this.vehicleTypeRepository.findAllActive();
  }
}
