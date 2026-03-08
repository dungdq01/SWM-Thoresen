import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class DeviceHeartbeatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    deviceCode: string;
    agentVersion?: string;
    portName?: string;
    lastWeightReadAt?: Date;
    bufferPendingCount?: number;
    healthStatus?: string;
  }) {
    return this.prisma.m8DeviceHeartbeat.create({ data });
  }

  async findLatestByDevice(deviceCode: string) {
    return this.prisma.m8DeviceHeartbeat.findFirst({
      where: { deviceCode },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findByDevice(deviceCode: string, limit: number = 10) {
    return this.prisma.m8DeviceHeartbeat.findMany({
      where: { deviceCode },
      take: limit,
      orderBy: { receivedAt: 'desc' },
    });
  }

  async cleanupOldHeartbeats(olderThanDays: number = 7) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return this.prisma.m8DeviceHeartbeat.deleteMany({
      where: { receivedAt: { lt: cutoffDate } },
    });
  }
}
