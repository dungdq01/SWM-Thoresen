import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ItemIncompatibilityRepository } from '../repositories/item-incompatibility.repository';
import { ItemRepository } from '../repositories/item.repository';
import { ItemGroupRepository } from '../repositories/item-group.repository';
import { LogService } from '../../foundation/services/log.service';
import {
  CreateItemIncompatibilityDto,
  UpdateItemIncompatibilityDto,
  ListItemIncompatibilityDto,
} from '../dto/item-incompatibility.dto';

interface ServiceContext {
  userId?: string;
  correlationId?: string;
}

@Injectable()
export class ItemIncompatibilityService {
  constructor(
    private readonly incompatibilityRepository: ItemIncompatibilityRepository,
    private readonly itemRepository: ItemRepository,
    private readonly itemGroupRepository: ItemGroupRepository,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateItemIncompatibilityDto, ctx: ServiceContext) {
    // Validate based on rule type
    await this.validateRuleType(dto);

    const result = await this.incompatibilityRepository.create({
      ruleType: dto.ruleType,
      itemId: dto.itemId,
      itemGroupId: dto.itemGroupId,
      incompatibleWithItemId: dto.incompatibleWithItemId,
      incompatibleWithGroupId: dto.incompatibleWithGroupId,
      reason: dto.reason,
      createdBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'ITEM_INCOMPATIBILITY',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async findById(id: string) {
    const result = await this.incompatibilityRepository.findById(id);
    if (!result) {
      throw new NotFoundException('Item incompatibility rule not found');
    }
    return result;
  }

  async findMany(dto: ListItemIncompatibilityDto) {
    return this.incompatibilityRepository.findMany({
      itemId: dto.itemId,
      itemGroupId: dto.itemGroupId,
      ruleType: dto.ruleType,
      isActive: dto.isActive,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }

  async update(id: string, dto: UpdateItemIncompatibilityDto, ctx: ServiceContext) {
    const existing = await this.incompatibilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Item incompatibility rule not found');
    }

    try {
      const result = await this.incompatibilityRepository.update(
        id,
        { reason: dto.reason, updatedBy: ctx.userId },
        dto.rowVersion,
      );

      await this.logService.createAuditLog({
        entityType: 'ITEM_INCOMPATIBILITY',
        entityId: id,
        action: 'UPDATE',
        userId: ctx.userId,
        oldValue: existing,
        newValue: result,
      });

      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new ConflictException('Record has been modified by another user');
      }
      throw error;
    }
  }

  async deactivate(id: string, ctx: ServiceContext) {
    const existing = await this.incompatibilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Item incompatibility rule not found');
    }

    if (!existing.isActive) {
      throw new BadRequestException('Rule is already deactivated');
    }

    const result = await this.incompatibilityRepository.deactivate(id, ctx.userId);

    await this.logService.createAuditLog({
      entityType: 'ITEM_INCOMPATIBILITY',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: existing,
      newValue: result,
    });

    return { success: true, message: 'Rule deactivated successfully' };
  }

  async reactivate(id: string, ctx: ServiceContext) {
    const existing = await this.incompatibilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Item incompatibility rule not found');
    }

    if (existing.isActive) {
      throw new BadRequestException('Rule is already active');
    }

    const result = await this.incompatibilityRepository.reactivate(id, ctx.userId);

    await this.logService.createAuditLog({
      entityType: 'ITEM_INCOMPATIBILITY',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: existing,
      newValue: result,
    });

    return result;
  }

  async checkIncompatibility(itemId1: string, itemId2: string): Promise<{ incompatible: boolean }> {
    const incompatible = await this.incompatibilityRepository.checkIncompatibility(itemId1, itemId2);
    return { incompatible };
  }

  async validateItemsCompatible(itemId1: string, itemId2: string): Promise<void> {
    const { incompatible } = await this.checkIncompatibility(itemId1, itemId2);
    if (incompatible) {
      throw new BadRequestException('Items are incompatible and cannot be stored together');
    }
  }

  private async validateRuleType(dto: CreateItemIncompatibilityDto) {
    switch (dto.ruleType) {
      case 'ITEM_TO_ITEM':
        if (!dto.itemId || !dto.incompatibleWithItemId) {
          throw new BadRequestException('ITEM_TO_ITEM rule requires itemId and incompatibleWithItemId');
        }
        // Validate items exist
        const [item1, item2] = await Promise.all([
          this.itemRepository.findById(dto.itemId),
          this.itemRepository.findById(dto.incompatibleWithItemId),
        ]);
        if (!item1) throw new NotFoundException('Item not found');
        if (!item2) throw new NotFoundException('Incompatible item not found');
        break;

      case 'ITEM_TO_GROUP':
        if (!dto.itemId || !dto.incompatibleWithGroupId) {
          throw new BadRequestException('ITEM_TO_GROUP rule requires itemId and incompatibleWithGroupId');
        }
        const [itemForGroup, group] = await Promise.all([
          this.itemRepository.findById(dto.itemId),
          this.itemGroupRepository.findById(dto.incompatibleWithGroupId),
        ]);
        if (!itemForGroup) throw new NotFoundException('Item not found');
        if (!group) throw new NotFoundException('Item group not found');
        break;

      case 'GROUP_TO_GROUP':
        if (!dto.itemGroupId || !dto.incompatibleWithGroupId) {
          throw new BadRequestException('GROUP_TO_GROUP rule requires itemGroupId and incompatibleWithGroupId');
        }
        const [group1, group2] = await Promise.all([
          this.itemGroupRepository.findById(dto.itemGroupId),
          this.itemGroupRepository.findById(dto.incompatibleWithGroupId),
        ]);
        if (!group1) throw new NotFoundException('Item group not found');
        if (!group2) throw new NotFoundException('Incompatible item group not found');
        break;
    }
  }
}
