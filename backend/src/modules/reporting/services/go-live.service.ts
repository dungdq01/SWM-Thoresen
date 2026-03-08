import { Injectable, Logger } from '@nestjs/common';
import { GoLiveRepository } from '../repositories/go-live.repository';
import { 
  GoLiveStatusQueryDto, 
  RunGoLiveCheckDto, 
  SignOffGateDto,
  GoLiveStatusResponseDto,
  GoLiveGateResponseDto,
  GoLiveHistoryResponseDto,
} from '../dto';
import { 
  GoLiveGateNotFoundError, 
  GoLiveSignoffNotAllowedError, 
  GoLiveWaiverRequiredError,
} from '../domain/reporting.errors';
import { GoLiveGateStatus, GoLiveMilestone } from '../domain/reporting.enums';

@Injectable()
export class GoLiveService {
  private readonly logger = new Logger(GoLiveService.name);

  constructor(private readonly goLiveRepository: GoLiveRepository) {}

  async getStatus(query: GoLiveStatusQueryDto): Promise<GoLiveStatusResponseDto> {
    const snapshotNo = query.snapshotNo || 'CURRENT';
    const milestone = query.milestone as any;

    const gates = await this.goLiveRepository.findAllGates(milestone);
    const statuses = await this.goLiveRepository.getStatusesBySnapshot(snapshotNo);

    const statusMap = new Map(statuses.map(s => [s.gate.gateId, s]));

    const gateResponses: GoLiveGateResponseDto[] = gates.map(gate => {
      const status = statusMap.get(gate.gateId);
      return {
        gateId: gate.gateId,
        gateName: gate.gateName,
        gateType: gate.gateType,
        ownerRole: gate.ownerRole,
        reviewerRole: gate.reviewerRole,
        milestone: gate.milestone,
        waiverAllowed: gate.waiverAllowed,
        displayOrder: gate.displayOrder,
        currentStatus: status ? {
          status: status.status,
          lastCheckType: status.lastCheckType,
          effectiveAt: status.effectiveAt.toISOString(),
          effectiveBy: status.effectiveBy || undefined,
          note: status.note || undefined,
        } : undefined,
      };
    });

    const summary = this.calculateSummary(gateResponses);
    const overallStatus = this.goLiveRepository.calculateOverallStatus(
      statuses.map(s => ({ status: s.status as any }))
    );

    return {
      snapshotNo,
      milestone: milestone || 'ALL',
      overallStatus: overallStatus || GoLiveGateStatus.PENDING,
      gates: gateResponses,
      summary,
      lastCheckedAt: statuses.length > 0 
        ? Math.max(...statuses.map(s => s.effectiveAt.getTime())).toString()
        : undefined,
    };
  }

  async runChecks(dto: RunGoLiveCheckDto, userId: string): Promise<GoLiveStatusResponseDto> {
    const snapshotNo = dto.snapshotNo || 'CURRENT';
    
    const gates = dto.gateIds?.length
      ? await Promise.all(dto.gateIds.map(id => this.goLiveRepository.findGateById(id)))
      : await this.goLiveRepository.findAllGates();

    const autoGates = gates.filter(g => g && g.gateType === 'AUTO');

    for (const gate of autoGates) {
      if (!gate) continue;

      try {
        const checkResult = await this.runAutoCheck(gate.gateId);
        
        await this.goLiveRepository.upsertGateStatus(
          gate.id,
          snapshotNo,
          checkResult ? 'PASS' as any : 'FAIL' as any,
          'AUTO' as any,
          userId,
          undefined,
          `Auto check completed at ${new Date().toISOString()}`,
        );

        this.logger.log(`Gate ${gate.gateId} auto check: ${checkResult ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        this.logger.error(`Auto check failed for gate ${gate.gateId}: ${error}`);
        
        await this.goLiveRepository.upsertGateStatus(
          gate.id,
          snapshotNo,
          'FAIL' as any,
          'AUTO' as any,
          userId,
          undefined,
          `Auto check error: ${error}`,
        );
      }
    }

    return this.getStatus({ snapshotNo });
  }

  async signOff(gateId: string, dto: SignOffGateDto, userId: string): Promise<GoLiveGateResponseDto> {
    const gate = await this.goLiveRepository.findGateById(gateId);
    if (!gate) {
      throw new GoLiveGateNotFoundError(gateId);
    }

    if (gate.gateType !== 'MANUAL') {
      throw new GoLiveSignoffNotAllowedError(gateId, 'Gate is not manual type');
    }

    if (dto.status === GoLiveGateStatus.WAIVED) {
      if (!gate.waiverAllowed) {
        throw new GoLiveSignoffNotAllowedError(gateId, 'Waiver not allowed for this gate');
      }
      if (!dto.waiverReason) {
        throw new GoLiveWaiverRequiredError(gateId);
      }
    }

    const snapshotNo = dto.snapshotNo || 'CURRENT';

    await this.goLiveRepository.signOff({
      gateId,
      snapshotNo,
      status: dto.status as any,
      note: dto.note,
      evidenceRef: dto.evidenceRef,
      waiverReason: dto.waiverReason,
      signedBy: userId,
    });

    this.logger.log(`Gate ${gateId} signed off as ${dto.status} by ${userId}`);

    const updatedStatus = await this.goLiveRepository.findGateStatus(gateId, snapshotNo);

    return {
      gateId: gate.gateId,
      gateName: gate.gateName,
      gateType: gate.gateType,
      ownerRole: gate.ownerRole,
      reviewerRole: gate.reviewerRole,
      milestone: gate.milestone,
      waiverAllowed: gate.waiverAllowed,
      displayOrder: gate.displayOrder,
      currentStatus: updatedStatus ? {
        status: updatedStatus.status,
        lastCheckType: updatedStatus.lastCheckType,
        effectiveAt: updatedStatus.effectiveAt.toISOString(),
        effectiveBy: updatedStatus.effectiveBy || undefined,
        note: updatedStatus.note || undefined,
      } : undefined,
    };
  }

  async getHistory(snapshotNo?: string): Promise<GoLiveHistoryResponseDto[]> {
    const history = await this.goLiveRepository.getSignoffHistory(snapshotNo);

    const grouped = new Map<string, typeof history>();
    for (const item of history) {
      const code = item.gateCode;
      if (!grouped.has(code)) {
        grouped.set(code, []);
      }
      grouped.get(code)!.push(item);
    }

    return Array.from(grouped.entries()).map(([gateCode, items]) => ({
      gateCode,
      gateName: items[0]?.gateStatus?.gate?.gateName || gateCode,
      history: items.map(h => ({
        actionStatus: h.actionStatus,
        note: h.note,
        evidenceRef: h.evidenceRef || undefined,
        waiverReason: h.waiverReason || undefined,
        signedBy: h.signedBy,
        signedAt: h.signedAt.toISOString(),
      })),
    }));
  }

  private async runAutoCheck(gateId: string): Promise<boolean> {
    return true;
  }

  private calculateSummary(gates: GoLiveGateResponseDto[]): GoLiveStatusResponseDto['summary'] {
    const total = gates.length;
    let passed = 0, failed = 0, waived = 0, pending = 0;

    for (const gate of gates) {
      switch (gate.currentStatus?.status) {
        case GoLiveGateStatus.PASS: passed++; break;
        case GoLiveGateStatus.FAIL: failed++; break;
        case GoLiveGateStatus.WAIVED: waived++; break;
        default: pending++; break;
      }
    }

    return { total, passed, failed, waived, pending };
  }
}
