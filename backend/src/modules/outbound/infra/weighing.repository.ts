/**
 * Weighing Repository - Infrastructure Layer
 * Handles persistence for weighing attempts
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WeighingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentWeighingAttemptCreateInput) {
    return this.prisma.shipmentWeighingAttempt.create({ data });
  }

  async findById(id: string) {
    return this.prisma.shipmentWeighingAttempt.findUnique({ where: { id } });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentWeighingAttempt.findMany({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { sequenceNo: 'asc' },
    });
  }

  async findByExternalEventId(externalEventId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: { externalEventId },
    });
  }

  async findValidTare(shipmentId: string) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentHeaderId: shipmentId,
        weighType: 'TARE',
        isValid: true,
      },
      orderBy: { sequenceNo: 'desc' },
    });
  }

  async findPreviousValidGross(shipmentId: string, currentSequence: number) {
    return this.prisma.shipmentWeighingAttempt.findFirst({
      where: {
        shipmentHeaderId: shipmentId,
        weighType: 'GROSS',
        sequenceNo: { lt: currentSequence },
        isValid: true,
      },
      orderBy: { sequenceNo: 'desc' },
    });
  }

  async getNextSequenceNo(shipmentId: string): Promise<number> {
    const last = await this.prisma.shipmentWeighingAttempt.findFirst({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { sequenceNo: 'desc' },
    });
    return (last?.sequenceNo || 0) + 1;
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
