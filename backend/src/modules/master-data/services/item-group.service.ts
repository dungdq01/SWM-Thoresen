import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ItemGroupRepository } from '../repositories/item-group.repository';
import { CreateItemGroupDto, UpdateItemGroupDto, ListItemGroupDto } from '../dto/item-group.dto';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdItemGroup } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class ItemGroupService {
  constructor(
    private readonly itemGroupRepository: ItemGroupRepository,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateItemGroupDto, ctx: RequestContext): Promise<MdItemGroup> {
    const existing = await this.itemGroupRepository.findByCode(dto.itemGroupCode);
    if (existing) throw new ConflictException(`Item group code ${dto.itemGroupCode} already exists`);

    const result = await this.itemGroupRepository.create({
      itemGroupCode: dto.itemGroupCode,
      itemGroupName: dto.itemGroupName,
      description: dto.description,
      cargoForm: dto.cargoForm,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({ entityType: 'ITEM_GROUP', entityId: result.id, action: 'CREATE', userId: ctx.userId, newValue: result });
    return result;
  }

  async findById(id: string): Promise<MdItemGroup> {
    const ig = await this.itemGroupRepository.findById(id);
    if (!ig) throw new NotFoundException(`Item group ${id} not found`);
    return ig;
  }

  async findMany(dto: ListItemGroupDto): Promise<PaginatedResult<MdItemGroup>> {
    return this.itemGroupRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateItemGroupDto, ctx: RequestContext): Promise<MdItemGroup> {
    const ig = await this.findById(id);
    if (!ig.isActive) throw new BadRequestException('Cannot update inactive item group');

    const oldValue = { ...ig };
    const result = await this.itemGroupRepository.update(id, {
      itemGroupName: dto.itemGroupName,
      description: dto.description,
      cargoForm: dto.cargoForm,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({ entityType: 'ITEM_GROUP', entityId: id, action: 'UPDATE', userId: ctx.userId, oldValue, newValue: result });
    return result;
  }

  async deactivate(id: string, ctx: RequestContext): Promise<MdItemGroup> {
    const ig = await this.findById(id);
    if (!ig.isActive) throw new BadRequestException('Item group is already inactive');
    const result = await this.itemGroupRepository.deactivate(id, ctx.userId!, ig.rowVersion);
    await this.logService.createAuditLog({ entityType: 'ITEM_GROUP', entityId: id, action: 'DEACTIVATE', userId: ctx.userId, oldValue: ig, newValue: result });
    return result;
  }

  async reactivate(id: string, ctx: RequestContext): Promise<MdItemGroup> {
    const ig = await this.findById(id);
    if (ig.isActive) throw new BadRequestException('Item group is already active');
    const result = await this.itemGroupRepository.reactivate(id, ctx.userId!, ig.rowVersion);
    await this.logService.createAuditLog({ entityType: 'ITEM_GROUP', entityId: id, action: 'REACTIVATE', userId: ctx.userId, oldValue: ig, newValue: result });
    return result;
  }

  async getNextCode(): Promise<string> {
    return this.itemGroupRepository.getNextCode();
  }
}
