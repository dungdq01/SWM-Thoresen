import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RackRepository } from '../repositories/rack.repository';
import { CreateRackDto, UpdateRackDto, ListRackDto } from '../dto/rack.dto';
import { DeactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdRack } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class RackService {
  constructor(
    private readonly rackRepository: RackRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateRackDto, ctx: RequestContext): Promise<MdRack> {
    // Validate warehouse exists
    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new BadRequestException('Warehouse not found');

    // Check unique rack code within warehouse
    const existing = await this.prisma.mdRack.findUnique({
      where: { warehouseId_rackCode: { warehouseId: dto.warehouseId, rackCode: dto.rackCode } },
    });
    if (existing) throw new ConflictException(`Rack code ${dto.rackCode} already exists in this warehouse`);

    // Validate zone if provided
    if (dto.zoneId) {
      const zone = await this.prisma.mdZone.findUnique({ where: { id: dto.zoneId } });
      if (!zone || zone.warehouseId !== dto.warehouseId) {
        throw new BadRequestException('Zone not found or does not belong to this warehouse');
      }
    }

    const result = await this.rackRepository.create({
      rackCode: dto.rackCode,
      rackName: dto.rackName,
      rackType: dto.rackType,
      xCoord: dto.xCoord,
      yCoord: dto.yCoord,
      rackWidthM: dto.rackWidthM,
      rackDepthM: dto.rackDepthM,
      rackHeightM: dto.rackHeightM,
      rotationDeg: dto.rotationDeg ?? 0,
      levels: dto.levels ?? 1,
      baysPerLevel: dto.baysPerLevel ?? 1,
      displayColor: dto.displayColor,
      warehouse: { connect: { id: dto.warehouseId } },
      ...(dto.zoneId ? { zone: { connect: { id: dto.zoneId } } } : {}),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'RACK',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async findById(id: string): Promise<MdRack> {
    const rack = await this.rackRepository.findById(id);
    if (!rack) throw new NotFoundException(`Rack ${id} not found`);
    return rack;
  }

  async findMany(dto: ListRackDto): Promise<PaginatedResult<MdRack>> {
    return this.rackRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      keyword: dto.keyword,
      isActive: dto.isActive,
      warehouseId: dto.warehouseId,
      zoneId: dto.zoneId,
      rackType: dto.rackType,
    });
  }

  async update(id: string, dto: UpdateRackDto, ctx: RequestContext): Promise<MdRack> {
    const rack = await this.findById(id);
    if (!rack.isActive) throw new BadRequestException('Cannot update inactive rack');

    const oldValue = { ...rack };
    const result = await this.rackRepository.update(
      id,
      {
        rackName: dto.rackName,
        rackType: dto.rackType,
        xCoord: dto.xCoord,
        yCoord: dto.yCoord,
        rackWidthM: dto.rackWidthM,
        rackDepthM: dto.rackDepthM,
        rackHeightM: dto.rackHeightM,
        rotationDeg: dto.rotationDeg,
        levels: dto.levels,
        baysPerLevel: dto.baysPerLevel,
        displayColor: dto.displayColor,
        ...(dto.zoneId !== undefined ? { zone: dto.zoneId ? { connect: { id: dto.zoneId } } : { disconnect: true } } : {}),
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );

    await this.logService.createAuditLog({
      entityType: 'RACK',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdRack> {
    const rack = await this.findById(id);
    if (!rack.isActive) throw new BadRequestException('Rack is already inactive');

    const result = await this.rackRepository.deactivate(id, ctx.userId!, rack.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'RACK',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: rack,
      newValue: result,
    });

    return result;
  }
}
