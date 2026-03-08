import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ChannelHealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByChannel(channelName: string) {
    return this.prisma.m8ChannelHealthSnapshot.findUnique({
      where: { channelName },
    });
  }

  async findAll() {
    return this.prisma.m8ChannelHealthSnapshot.findMany({
      orderBy: { channelName: 'asc' },
    });
  }

  async upsert(channelName: string, data: {
    status?: string;
    openAlertCount?: number;
    backlogCount?: number;
    successRate1h?: number;
    avgLatencyMs1h?: number;
  }) {
    return this.prisma.m8ChannelHealthSnapshot.upsert({
      where: { channelName },
      update: data as any,
      create: { channelName, ...data } as any,
    });
  }

  async updateHealth(channelName: string, data: any) {
    return this.prisma.m8ChannelHealthSnapshot.update({
      where: { channelName },
      data,
    });
  }
}
