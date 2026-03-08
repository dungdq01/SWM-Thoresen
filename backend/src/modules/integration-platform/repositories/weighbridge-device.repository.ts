import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WeighbridgeDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(deviceCode: string) {
    return this.prisma.m8WeighbridgeDevice.findUnique({
      where: { deviceCode },
    });
  }

  async findById(id: string) {
    return this.prisma.m8WeighbridgeDevice.findUnique({
      where: { id },
    });
  }

  async findAll(params: {
    warehouseId?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { warehouseId, isActive, skip = 0, take = 50 } = params;

    const where: Prisma.M8WeighbridgeDeviceWhereInput = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.m8WeighbridgeDevice.findMany({
        where,
        skip,
        take,
        orderBy: { deviceCode: 'asc' },
      }),
      this.prisma.m8WeighbridgeDevice.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findActiveDevices() {
    return this.prisma.m8WeighbridgeDevice.findMany({
      where: { isActive: true },
      orderBy: { deviceCode: 'asc' },
    });
  }

  async updateLastSeen(deviceCode: string, lastSeenAt: Date, lastStatus: string) {
    return this.prisma.m8WeighbridgeDevice.update({
      where: { deviceCode },
      data: {
        lastSeenAt,
        lastStatus: lastStatus as any,
      },
    });
  }

  async create(data: Prisma.M8WeighbridgeDeviceCreateInput) {
    return this.prisma.m8WeighbridgeDevice.create({ data });
  }

  async update(id: string, data: Prisma.M8WeighbridgeDeviceUpdateInput) {
    return this.prisma.m8WeighbridgeDevice.update({
      where: { id },
      data,
    });
  }

  async findOfflineDevices(timeoutMinutes: number) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return this.prisma.m8WeighbridgeDevice.findMany({
      where: {
        isActive: true,
        OR: [
          { lastSeenAt: null },
          { lastSeenAt: { lt: cutoffTime } },
        ],
      },
    });
  }
}
