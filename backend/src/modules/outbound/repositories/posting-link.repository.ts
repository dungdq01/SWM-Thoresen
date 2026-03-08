import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PostingAction, PostingStatus, Prisma } from '@prisma/client';

export interface CreatePostingLinkParams {
  shipmentHeaderId: string;
  shipmentLineId: string;
  postingAction: PostingAction;
  m3ExternalId: string;
  requestPayload?: Record<string, unknown>;
  correlationId: string;
}

@Injectable()
export class PostingLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreatePostingLinkParams) {
    return this.prisma.shipmentPostingLink.create({
      data: {
        shipmentHeaderId: params.shipmentHeaderId,
        shipmentLineId: params.shipmentLineId,
        postingAction: params.postingAction,
        m3ExternalId: params.m3ExternalId,
        status: 'PENDING',
        requestPayload: params.requestPayload as Prisma.InputJsonValue,
        correlationId: params.correlationId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentPostingLink.findUnique({
      where: { id },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByM3ExternalId(m3ExternalId: string) {
    return this.prisma.shipmentPostingLink.findUnique({
      where: { m3ExternalId },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentPostingLink.findMany({
      where: { shipmentHeaderId },
      include: {
        line: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findByLineId(shipmentLineId: string) {
    return this.prisma.shipmentPostingLink.findMany({
      where: { shipmentLineId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async markSuccess(id: string, m3TransId: string, responsePayload?: Record<string, unknown>) {
    return this.prisma.shipmentPostingLink.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        m3TransId,
        responsePayload: responsePayload as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, responsePayload?: Record<string, unknown>) {
    return this.prisma.shipmentPostingLink.update({
      where: { id },
      data: {
        status: 'FAILED',
        responsePayload: responsePayload as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
  }

  async findPendingByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentPostingLink.findMany({
      where: {
        shipmentHeaderId,
        status: 'PENDING',
      },
    });
  }

  async countSuccessByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentPostingLink.count({
      where: {
        shipmentHeaderId,
        postingAction: 'POST',
        status: 'SUCCESS',
      },
    });
  }

  async hasPostedLine(shipmentLineId: string) {
    const count = await this.prisma.shipmentPostingLink.count({
      where: {
        shipmentLineId,
        postingAction: 'POST',
        status: 'SUCCESS',
      },
    });
    return count > 0;
  }
}
