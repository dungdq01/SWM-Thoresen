import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WeighType, Prisma } from '@prisma/client';

@Injectable()
export class WeighingAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentWeighingAttemptCreateInput) {
    return this.prisma.shipmentWeighingAttempt.create({
      data,
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentWeighingAttempt.findUnique({
      where: { id },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentWeighingAttempt.findMany({
      where: { shipmentHeaderId },
      include: {
        line: true,
      },
      orderBy: [{ sequenceNo: 'asc' }, { capturedAt: 'asc' }],
    });
  }

  async findByExternalEventId(externalEventId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: { externalEventId },
    });
  }

  async findValidTare(shipmentHeaderId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentHeaderId,
        weighType: 'TARE',
        isValid: true,
      },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async findLatestValidGross(shipmentHeaderId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentHeaderId,
        weighType: 'GROSS',
        isValid: true,
      },
      orderBy: { sequenceNo: 'desc' },
    });
  }

  async findPreviousValidGross(shipmentHeaderId: string, beforeSequenceNo: number) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentHeaderId,
        weighType: 'GROSS',
        isValid: true,
        sequenceNo: { lt: beforeSequenceNo },
      },
      orderBy: { sequenceNo: 'desc' },
    });
  }

  async findValidGrossByLine(shipmentLineId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentLineId,
        weighType: 'GROSS',
        isValid: true,
      },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async countValidGross(shipmentHeaderId: string) {
    return this.prisma.shipmentWeighingAttempt.count({
      where: {
        shipmentHeaderId,
        weighType: 'GROSS',
        isValid: true,
      },
    });
  }

  async getNextSequenceNo(shipmentHeaderId: string) {
    const result = await this.prisma.shipmentWeighingAttempt.aggregate({
      where: {
        shipmentHeaderId,
        isValid: true,
      },
      _max: {
        sequenceNo: true,
      },
    });
    return (result._max.sequenceNo || 0) + 1;
  }

  async markDuplicate(id: string, duplicateOfAttemptId: string) {
    return this.prisma.shipmentWeighingAttempt.update({
      where: { id },
      data: {
        isValid: false,
        duplicateOfAttemptId,
      },
    });
  }

  async invalidate(id: string, reason: string) {
    return this.prisma.shipmentWeighingAttempt.update({
      where: { id },
      data: {
        isValid: false,
        remark: reason,
      },
    });
  }
}
