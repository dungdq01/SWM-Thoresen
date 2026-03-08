import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RptGoLiveGateStatus, RptGoLiveGateType, RptGoLiveMilestone } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface SignOffParams {
  gateId: string;
  snapshotNo: string;
  status: RptGoLiveGateStatus;
  note: string;
  evidenceRef?: string;
  waiverReason?: string;
  signedBy: string;
}

@Injectable()
export class GoLiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllGates(milestone?: RptGoLiveMilestone) {
    return this.prisma.rptGoLiveGate.findMany({
      where: {
        isActive: true,
        ...(milestone && { milestone }),
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        statuses: {
          orderBy: { effectiveAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findGateById(gateId: string) {
    return this.prisma.rptGoLiveGate.findUnique({
      where: { gateId },
    });
  }

  async findGateByUuid(id: string) {
    return this.prisma.rptGoLiveGate.findUnique({
      where: { id },
    });
  }

  async findGateStatus(gateId: string, snapshotNo: string) {
    return this.prisma.rptGoLiveGateStatusRecord.findFirst({
      where: {
        gate: { gateId },
        snapshotNo,
      },
      include: {
        gate: true,
        history: {
          orderBy: { signedAt: 'desc' },
        },
      },
    });
  }

  async upsertGateStatus(
    gateUuid: string,
    snapshotNo: string,
    status: RptGoLiveGateStatus,
    lastCheckType: RptGoLiveGateType,
    effectiveBy?: string,
    lastRunRef?: string,
    note?: string,
    evidenceRef?: string,
    waiverReason?: string,
  ) {
    const existingStatus = await this.prisma.rptGoLiveGateStatusRecord.findUnique({
      where: { gateId_snapshotNo: { gateId: gateUuid, snapshotNo } },
    });

    if (existingStatus) {
      return this.prisma.rptGoLiveGateStatusRecord.update({
        where: { id: existingStatus.id },
        data: {
          status,
          lastCheckType,
          lastRunRef,
          effectiveAt: new Date(),
          effectiveBy,
          note,
          evidenceRef,
          waiverReason,
        },
      });
    }

    return this.prisma.rptGoLiveGateStatusRecord.create({
      data: {
        gateId: gateUuid,
        snapshotNo,
        status,
        lastCheckType,
        lastRunRef,
        effectiveAt: new Date(),
        effectiveBy,
        note,
        evidenceRef,
        waiverReason,
      },
    });
  }

  async signOff(params: SignOffParams) {
    return this.prisma.$transaction(async (tx) => {
      const gate = await tx.rptGoLiveGate.findUnique({
        where: { gateId: params.gateId },
      });

      if (!gate) {
        throw new Error(`Gate not found: ${params.gateId}`);
      }

      // HI-7 Fix: Inline upsertGateStatus logic inside transaction to avoid tx leak
      const existingStatus = await tx.rptGoLiveGateStatusRecord.findUnique({
        where: { gateId_snapshotNo: { gateId: gate.id, snapshotNo: params.snapshotNo } },
      });

      const gateStatus = existingStatus
        ? await tx.rptGoLiveGateStatusRecord.update({
            where: { id: existingStatus.id },
            data: {
              status: params.status,
              lastCheckType: RptGoLiveGateType.MANUAL,
              effectiveAt: new Date(),
              effectiveBy: params.signedBy,
              note: params.note,
              evidenceRef: params.evidenceRef,
              waiverReason: params.waiverReason,
            },
          })
        : await tx.rptGoLiveGateStatusRecord.create({
            data: {
              gateId: gate.id,
              snapshotNo: params.snapshotNo,
              status: params.status,
              lastCheckType: RptGoLiveGateType.MANUAL,
              effectiveAt: new Date(),
              effectiveBy: params.signedBy,
              note: params.note,
              evidenceRef: params.evidenceRef,
              waiverReason: params.waiverReason,
            },
          });

      await tx.rptGoLiveSignoffHistory.create({
        data: {
          gateStatusId: gateStatus.id,
          gateCode: params.gateId,
          actionStatus: params.status,
          note: params.note,
          evidenceRef: params.evidenceRef,
          waiverReason: params.waiverReason,
          signedBy: params.signedBy,
          signedAt: new Date(),
        },
      });

      return gateStatus;
    });
  }

  async getSignoffHistory(snapshotNo?: string) {
    return this.prisma.rptGoLiveSignoffHistory.findMany({
      where: snapshotNo ? {
        gateStatus: { snapshotNo },
      } : undefined,
      orderBy: { signedAt: 'desc' },
      include: {
        gateStatus: {
          include: { gate: true },
        },
      },
    });
  }

  async getStatusesBySnapshot(snapshotNo: string) {
    return this.prisma.rptGoLiveGateStatusRecord.findMany({
      where: { snapshotNo },
      include: {
        gate: true,
        history: {
          orderBy: { signedAt: 'desc' },
        },
      },
    });
  }

  calculateOverallStatus(statuses: { status: RptGoLiveGateStatus }[]): RptGoLiveGateStatus {
    if (statuses.some(s => s.status === RptGoLiveGateStatus.FAIL)) {
      return RptGoLiveGateStatus.FAIL;
    }
    if (statuses.some(s => s.status === RptGoLiveGateStatus.PENDING)) {
      return RptGoLiveGateStatus.PENDING;
    }
    if (statuses.some(s => s.status === RptGoLiveGateStatus.WAIVED)) {
      return RptGoLiveGateStatus.WAIVED;
    }
    return RptGoLiveGateStatus.PASS;
  }
}
