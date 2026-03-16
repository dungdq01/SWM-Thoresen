import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { LocationTypeRepository } from '../repositories/location-type.repository';
import { CreateLocationTypeDto, UpdateLocationTypeDto, ListLocationTypeDto } from '../dto/location-type.dto';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdLocationType } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class LocationTypeService {
  constructor(
    private readonly locationTypeRepository: LocationTypeRepository,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateLocationTypeDto, ctx: RequestContext): Promise<MdLocationType> {
    const existing = await this.locationTypeRepository.findByCode(dto.locationTypeCode);
    if (existing) throw new ConflictException(`Location type code ${dto.locationTypeCode} already exists`);

    const result = await this.locationTypeRepository.create({
      locationTypeCode: dto.locationTypeCode,
      locationTypeName: dto.locationTypeName,
      description: dto.description,
      isDefault: dto.isDefault || false,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({ entityType: 'LOCATION_TYPE', entityId: result.id, action: 'CREATE', userId: ctx.userId, newValue: result });
    return result;
  }

  async findById(id: string): Promise<MdLocationType> {
    const lt = await this.locationTypeRepository.findById(id);
    if (!lt) throw new NotFoundException(`Location type ${id} not found`);
    return lt;
  }

  async findMany(dto: ListLocationTypeDto): Promise<PaginatedResult<MdLocationType>> {
    return this.locationTypeRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateLocationTypeDto, ctx: RequestContext): Promise<MdLocationType> {
    const lt = await this.findById(id);
    const oldValue = { ...lt };
    const result = await this.locationTypeRepository.update(id, {
      locationTypeName: dto.locationTypeName,
      description: dto.description,
      isDefault: dto.isDefault,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({ entityType: 'LOCATION_TYPE', entityId: id, action: 'UPDATE', userId: ctx.userId, oldValue, newValue: result });
    return result;
  }

  async delete(id: string, ctx: RequestContext): Promise<MdLocationType> {
    const lt = await this.findById(id);
    const result = await this.locationTypeRepository.delete(id);
    await this.logService.createAuditLog({ entityType: 'LOCATION_TYPE', entityId: id, action: 'DELETE', userId: ctx.userId, oldValue: lt });
    return result;
  }

  async getNextCode(): Promise<string> {
    return this.locationTypeRepository.getNextCode();
  }
}
