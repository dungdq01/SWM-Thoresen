import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface WeighLogQueryParams {
  scaleDeviceId?: string;
  vehicleNumber?: string;
  receiptId?: string;
  shipmentId?: string;
  weighingType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isManualEntry?: boolean;
  sourceChannel?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class WeighbridgeLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEventId(weighbridgeEventId: string) {
    return this.prisma.m8WeighbridgeLog.findUnique({
      where: { weighbridgeEventId },
      include: { eventState: true },
    });
  }

  async findById(id: string) {
    return this.prisma.m8WeighbridgeLog.findUnique({
      where: { id },
      include: { eventState: true, device: true, weightRecords: { orderBy: { sequence: 'asc' as const } } },
    });
  }

  async findMany(params: WeighLogQueryParams) {
    const {
      scaleDeviceId,
      vehicleNumber,
      receiptId,
      shipmentId,
      weighingType,
      dateFrom,
      dateTo,
      isManualEntry,
      sourceChannel,
      skip = 0,
      take = 20,
    } = params;

    const where: Prisma.M8WeighbridgeLogWhereInput = {};

    if (scaleDeviceId) where.scaleDeviceId = scaleDeviceId;
    if (vehicleNumber) where.vehicleNumber = { contains: vehicleNumber, mode: 'insensitive' };
    if (receiptId) where.receiptId = receiptId;
    if (shipmentId) where.shipmentId = shipmentId;
    if (weighingType) where.weighingType = weighingType as any;
    if (isManualEntry !== undefined) where.isManualEntry = isManualEntry;
    if (sourceChannel) where.sourceChannel = sourceChannel;

    if (dateFrom || dateTo) {
      where.weighingTimestamp = {};
      if (dateFrom) where.weighingTimestamp.gte = dateFrom;
      if (dateTo) where.weighingTimestamp.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.m8WeighbridgeLog.findMany({
        where,
        include: {
          eventState: true,
          device: true,
          weightRecords: { orderBy: { sequence: 'asc' as const } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.m8WeighbridgeLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: Prisma.M8WeighbridgeLogCreateInput) {
    return this.prisma.m8WeighbridgeLog.create({
      data,
      include: { eventState: true },
    });
  }

  async update(id: string, data: Prisma.M8WeighbridgeLogUncheckedUpdateInput) {
    return this.prisma.m8WeighbridgeLog.update({
      where: { id },
      data,
      include: { eventState: true },
    });
  }

  async existsByEventId(weighbridgeEventId: string): Promise<boolean> {
    const count = await this.prisma.m8WeighbridgeLog.count({
      where: { weighbridgeEventId },
    });
    return count > 0;
  }

  async findByCorrelationId(correlationId: string) {
    return this.prisma.m8WeighbridgeLog.findMany({
      where: { correlationId },
      include: { eventState: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReference(referenceType: 'RECEIPT' | 'SHIPMENT', referenceId: string) {
    const where: Prisma.M8WeighbridgeLogWhereInput =
      referenceType === 'RECEIPT'
        ? { receiptId: referenceId }
        : { shipmentId: referenceId };

    return this.prisma.m8WeighbridgeLog.findMany({
      where,
      include: { eventState: true },
      orderBy: { weighingSequence: 'asc' },
    });
  }

  async countByDevice(scaleDeviceId: string, dateFrom: Date, dateTo: Date) {
    return this.prisma.m8WeighbridgeLog.count({
      where: {
        scaleDeviceId,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    });
  }

  async getLatencyStats(dateFrom: Date, dateTo: Date) {
    const result = await this.prisma.m8WeighbridgeLog.aggregate({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        latencyMs: { not: null },
      },
      _avg: { latencyMs: true },
      _max: { latencyMs: true },
      _min: { latencyMs: true },
    });
    return result;
  }
}
