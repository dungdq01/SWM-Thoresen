import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CarrierRepository } from '../repositories/carrier.repository';
import { CreateCarrierDto, UpdateCarrierDto, ListCarrierDto } from '../dto/carrier.dto';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdCarrier } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class CarrierService {
  constructor(
    private readonly carrierRepository: CarrierRepository,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateCarrierDto, ctx: RequestContext): Promise<MdCarrier> {
    const existing = await this.carrierRepository.findByCode(dto.carrierCode);
    if (existing) throw new ConflictException(`Carrier code ${dto.carrierCode} already exists`);

    const result = await this.carrierRepository.create({
      carrierCode: dto.carrierCode,
      carrierName: dto.carrierName,
      contactName: dto.contactName,
      phone: dto.phone,
      carrierGroup: dto.carrierGroup,
      transportMode: dto.transportMode,
      defaultVehicleTypeCode: dto.defaultVehicleTypeCode,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'CARRIER',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async findById(id: string): Promise<MdCarrier> {
    const carrier = await this.carrierRepository.findById(id);
    if (!carrier) throw new NotFoundException(`Carrier ${id} not found`);
    return carrier;
  }

  async findMany(dto: ListCarrierDto): Promise<PaginatedResult<MdCarrier>> {
    return this.carrierRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateCarrierDto, ctx: RequestContext): Promise<MdCarrier> {
    const carrier = await this.findById(id);
    if (!carrier.isActive) throw new BadRequestException('Cannot update inactive carrier');

    const oldValue = { ...carrier };
    const result = await this.carrierRepository.update(id, {
      carrierName: dto.carrierName,
      contactName: dto.contactName,
      phone: dto.phone,
      carrierGroup: dto.carrierGroup,
      transportMode: dto.transportMode,
      defaultVehicleTypeCode: dto.defaultVehicleTypeCode,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'CARRIER',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, ctx: RequestContext): Promise<MdCarrier> {
    const carrier = await this.findById(id);
    if (!carrier.isActive) throw new BadRequestException('Carrier is already inactive');
    const result = await this.carrierRepository.deactivate(id, ctx.userId!, carrier.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'CARRIER', entityId: id, action: 'DEACTIVATE', userId: ctx.userId, oldValue: carrier, newValue: result,
    });
    return result;
  }

  async reactivate(id: string, ctx: RequestContext): Promise<MdCarrier> {
    const carrier = await this.findById(id);
    if (carrier.isActive) throw new BadRequestException('Carrier is already active');
    const result = await this.carrierRepository.reactivate(id, ctx.userId!, carrier.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'CARRIER', entityId: id, action: 'REACTIVATE', userId: ctx.userId, oldValue: carrier, newValue: result,
    });
    return result;
  }

  async getNextCode(): Promise<string> {
    return this.carrierRepository.getNextCode();
  }
}
