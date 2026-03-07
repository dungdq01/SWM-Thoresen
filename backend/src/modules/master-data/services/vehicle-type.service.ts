import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VehicleTypeRepository } from '../repositories/vehicle-type.repository';
import { DeactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto } from '../dto/vehicle-type.dto';
import { MdVehicleType } from '@prisma/client';

export { CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto };

@Injectable()
export class VehicleTypeService {
  constructor(private readonly vehicleTypeRepository: VehicleTypeRepository) {}

  async create(dto: CreateVehicleTypeDto, ctx: RequestContext): Promise<MdVehicleType> {
    const existing = await this.vehicleTypeRepository.findByCode(dto.vehicleTypeCode);
    if (existing) throw new ConflictException(`Vehicle type code ${dto.vehicleTypeCode} already exists`);

    return this.vehicleTypeRepository.create({
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

    return this.vehicleTypeRepository.update(id, {
      vehicleTypeName: dto.vehicleTypeName,
      category: dto.category,
      defaultTareWeightKg: dto.defaultTareWeightKg,
      maxPayloadKg: dto.maxPayloadKg,
      teuEquivalent: dto.teuEquivalent,
      handlingFeeGroup: dto.handlingFeeGroup,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdVehicleType> {
    const vehicleType = await this.findById(id);
    if (!vehicleType.isActive) throw new BadRequestException('Vehicle type is already inactive');
    return this.vehicleTypeRepository.deactivate(id, ctx.userId!, vehicleType.rowVersion);
  }

  async reactivate(id: string, dto: any, ctx: RequestContext): Promise<MdVehicleType> {
    const vehicleType = await this.findById(id);
    if (vehicleType.isActive) throw new BadRequestException('Vehicle type is already active');
    return this.vehicleTypeRepository.reactivate(id, ctx.userId!, vehicleType.rowVersion);
  }

  async findAllActive(): Promise<MdVehicleType[]> {
    return this.vehicleTypeRepository.findAllActive();
  }
}
