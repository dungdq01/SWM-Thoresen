import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class OwnerWarehouseAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    ownerId: string;
    warehouseId: string;
    createdBy?: string;
  }) {
    return this.prisma.mdOwnerWarehouseAccess.create({
      data: {
        ownerId: data.ownerId,
        warehouseId: data.warehouseId,
        isActive: true,
        createdBy: data.createdBy,
      },
      include: {
        owner: true,
        warehouse: true,
      },
    });
  }

  async findByOwnerAndWarehouse(ownerId: string, warehouseId: string) {
    return this.prisma.mdOwnerWarehouseAccess.findUnique({
      where: {
        ownerId_warehouseId: { ownerId, warehouseId },
      },
      include: {
        owner: true,
        warehouse: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.mdOwnerWarehouseAccess.findUnique({
      where: { id },
      include: {
        owner: true,
        warehouse: true,
      },
    });
  }

  async findByOwnerId(ownerId: string, includeInactive = false) {
    return this.prisma.mdOwnerWarehouseAccess.findMany({
      where: {
        ownerId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        owner: true,
        warehouse: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByWarehouseId(warehouseId: string, includeInactive = false) {
    return this.prisma.mdOwnerWarehouseAccess.findMany({
      where: {
        warehouseId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        owner: true,
        warehouse: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deactivate(id: string, userId?: string) {
    return this.prisma.mdOwnerWarehouseAccess.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
      include: {
        owner: true,
        warehouse: true,
      },
    });
  }

  async reactivate(id: string, userId?: string) {
    return this.prisma.mdOwnerWarehouseAccess.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
      include: {
        owner: true,
        warehouse: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.mdOwnerWarehouseAccess.delete({
      where: { id },
    });
  }

  async hasAccess(ownerId: string, warehouseId: string): Promise<boolean> {
    const access = await this.prisma.mdOwnerWarehouseAccess.findFirst({
      where: {
        ownerId,
        warehouseId,
        isActive: true,
      },
    });
    return !!access;
  }
}
