import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VesselRepository } from '../repositories/vessel.repository';
import { CreateVesselDto, UpdateVesselDto, ListVesselDto } from '../dto/vessel.dto';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdVessel } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class VesselService {
  constructor(
    private readonly vesselRepository: VesselRepository,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateVesselDto, ctx: RequestContext): Promise<MdVessel> {
    const existing = await this.vesselRepository.findByCode(dto.vesselCode);
    if (existing) throw new ConflictException(`Vessel code ${dto.vesselCode} already exists`);

    const result = await this.vesselRepository.create({
      vesselCode: dto.vesselCode,
      vesselName: dto.vesselName,
      imoNumber: dto.imoNumber,
      vesselType: dto.vesselType as any,
      nationality: dto.nationality,
      callSign: dto.callSign,
      dwtTon: dto.dwtTon,
      loaM: dto.loaM,
      beamM: dto.beamM,
      draftM: dto.draftM,
      yearBuilt: dto.yearBuilt,
      owner: dto.owner,
      operator: dto.operator,
      notes: dto.notes,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({ entityType: 'VESSEL', entityId: result.id, action: 'CREATE', userId: ctx.userId, newValue: result });
    return result;
  }

  async findById(id: string): Promise<MdVessel> {
    const vessel = await this.vesselRepository.findById(id);
    if (!vessel) throw new NotFoundException(`Vessel ${id} not found`);
    return vessel;
  }

  async findMany(dto: ListVesselDto): Promise<PaginatedResult<MdVessel>> {
    return this.vesselRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateVesselDto, ctx: RequestContext): Promise<MdVessel> {
    const vessel = await this.findById(id);
    if (!vessel.isActive) throw new BadRequestException('Cannot update inactive vessel');

    const oldValue = { ...vessel };
    const result = await this.vesselRepository.update(id, {
      vesselName: dto.vesselName,
      imoNumber: dto.imoNumber,
      vesselType: dto.vesselType as any,
      nationality: dto.nationality,
      callSign: dto.callSign,
      dwtTon: dto.dwtTon,
      loaM: dto.loaM,
      beamM: dto.beamM,
      draftM: dto.draftM,
      yearBuilt: dto.yearBuilt,
      owner: dto.owner,
      operator: dto.operator,
      notes: dto.notes,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({ entityType: 'VESSEL', entityId: id, action: 'UPDATE', userId: ctx.userId, oldValue, newValue: result });
    return result;
  }

  async deactivate(id: string, ctx: RequestContext): Promise<MdVessel> {
    const vessel = await this.findById(id);
    if (!vessel.isActive) throw new BadRequestException('Vessel is already inactive');
    const result = await this.vesselRepository.deactivate(id, ctx.userId!, vessel.rowVersion);
    await this.logService.createAuditLog({ entityType: 'VESSEL', entityId: id, action: 'DEACTIVATE', userId: ctx.userId, oldValue: vessel, newValue: result });
    return result;
  }

  async reactivate(id: string, ctx: RequestContext): Promise<MdVessel> {
    const vessel = await this.findById(id);
    if (vessel.isActive) throw new BadRequestException('Vessel is already active');
    const result = await this.vesselRepository.reactivate(id, ctx.userId!, vessel.rowVersion);
    await this.logService.createAuditLog({ entityType: 'VESSEL', entityId: id, action: 'REACTIVATE', userId: ctx.userId, oldValue: vessel, newValue: result });
    return result;
  }

  async getNextCode(): Promise<string> {
    return this.vesselRepository.getNextCode();
  }
}
