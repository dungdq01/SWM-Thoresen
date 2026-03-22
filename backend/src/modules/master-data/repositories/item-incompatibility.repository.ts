import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IncompatibilityRuleType } from '@prisma/client';

@Injectable()
export class ItemIncompatibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    ruleType: IncompatibilityRuleType;
    itemId?: string;
    itemGroupId?: string;
    incompatibleWithItemId?: string;
    incompatibleWithGroupId?: string;
    reason?: string;
    createdBy?: string;
  }) {
    return this.prisma.mdItemIncompatibility.create({
      data: {
        ruleType: data.ruleType,
        itemId: data.itemId,
        itemGroupId: data.itemGroupId,
        incompatibleWithItemId: data.incompatibleWithItemId,
        incompatibleWithGroupId: data.incompatibleWithGroupId,
        reason: data.reason,
        isActive: true,
        createdBy: data.createdBy,
      },
      include: {
        item: true,
        itemGroup: true,
        incompatibleWithItem: true,
        incompatibleWithGroup: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.mdItemIncompatibility.findUnique({
      where: { id },
      include: {
        item: true,
        itemGroup: true,
        incompatibleWithItem: true,
        incompatibleWithGroup: true,
      },
    });
  }

  async findMany(params: {
    itemId?: string;
    itemGroupId?: string;
    ruleType?: IncompatibilityRuleType;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const { itemId, itemGroupId, ruleType, isActive = true, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(itemId && { OR: [{ itemId }, { incompatibleWithItemId: itemId }] }),
      ...(itemGroupId && { OR: [{ itemGroupId }, { incompatibleWithGroupId: itemGroupId }] }),
      ...(ruleType && { ruleType }),
      isActive,
    };

    const [data, total] = await Promise.all([
      this.prisma.mdItemIncompatibility.findMany({
        where,
        include: {
          item: true,
          itemGroup: true,
          incompatibleWithItem: true,
          incompatibleWithGroup: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mdItemIncompatibility.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async update(
    id: string,
    data: {
      reason?: string;
      updatedBy?: string;
    },
    expectedRowVersion: number,
  ) {
    return this.prisma.mdItemIncompatibility.update({
      where: { id, rowVersion: BigInt(expectedRowVersion) },
      data: {
        reason: data.reason,
        updatedBy: data.updatedBy,
        rowVersion: { increment: 1 },
      },
      include: {
        item: true,
        itemGroup: true,
        incompatibleWithItem: true,
        incompatibleWithGroup: true,
      },
    });
  }

  async deactivate(id: string, userId?: string) {
    return this.prisma.mdItemIncompatibility.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId?: string) {
    return this.prisma.mdItemIncompatibility.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async checkIncompatibility(itemId1: string, itemId2: string): Promise<boolean> {
    // Check direct item-to-item incompatibility
    const directRule = await this.prisma.mdItemIncompatibility.findFirst({
      where: {
        isActive: true,
        ruleType: 'ITEM_TO_ITEM',
        OR: [
          { itemId: itemId1, incompatibleWithItemId: itemId2 },
          { itemId: itemId2, incompatibleWithItemId: itemId1 },
        ],
      },
    });

    if (directRule) return true;

    // Get item groups for both items
    const [item1, item2] = await Promise.all([
      this.prisma.mdItem.findUnique({ where: { id: itemId1 }, select: { itemGroupId: true } }),
      this.prisma.mdItem.findUnique({ where: { id: itemId2 }, select: { itemGroupId: true } }),
    ]);

    // Check item-to-group incompatibility
    if (item2?.itemGroupId) {
      const itemToGroupRule = await this.prisma.mdItemIncompatibility.findFirst({
        where: {
          isActive: true,
          ruleType: 'ITEM_TO_GROUP',
          itemId: itemId1,
          incompatibleWithGroupId: item2.itemGroupId,
        },
      });
      if (itemToGroupRule) return true;
    }

    if (item1?.itemGroupId) {
      const itemToGroupRule = await this.prisma.mdItemIncompatibility.findFirst({
        where: {
          isActive: true,
          ruleType: 'ITEM_TO_GROUP',
          itemId: itemId2,
          incompatibleWithGroupId: item1.itemGroupId,
        },
      });
      if (itemToGroupRule) return true;
    }

    // Check group-to-group incompatibility
    if (item1?.itemGroupId && item2?.itemGroupId) {
      const groupToGroupRule = await this.prisma.mdItemIncompatibility.findFirst({
        where: {
          isActive: true,
          ruleType: 'GROUP_TO_GROUP',
          OR: [
            { itemGroupId: item1.itemGroupId, incompatibleWithGroupId: item2.itemGroupId },
            { itemGroupId: item2.itemGroupId, incompatibleWithGroupId: item1.itemGroupId },
          ],
        },
      });
      if (groupToGroupRule) return true;
    }

    return false;
  }
}
