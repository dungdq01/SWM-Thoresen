import { Injectable, Logger } from '@nestjs/common';
import { VasWorkOrderRepository, VasWoWithRelations } from '../repositories/vas-work-order.repository';
import { VasSessionRepository } from '../repositories/vas-session.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasExceptionLogRepository } from '../repositories/vas-exception-log.repository';
import { VasOutboxRepository } from '../repositories/vas-outbox.repository';
import { QueryVasWoDto } from '../dto/query-vas-wo.dto';
import { VasWoNotFoundError } from '../domain/vas.errors';

@Injectable()
export class VasQueryService {
  private readonly logger = new Logger(VasQueryService.name);

  constructor(
    private readonly woRepo: VasWorkOrderRepository,
    private readonly sessionRepo: VasSessionRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly exceptionLogRepo: VasExceptionLogRepository,
    private readonly outboxRepo: VasOutboxRepository,
  ) {}

  async getDetail(woId: string) {
    const wo = await this.woRepo.findById(woId);
    if (!wo) {
      throw new VasWoNotFoundError(woId);
    }

    const [sessions, sessionSummary, stateHistory, exceptions, outboxEvents] = await Promise.all([
      this.sessionRepo.findByWoId(woId),
      this.sessionRepo.getSessionSummary(woId),
      this.stateHistoryRepo.findByWoId(woId),
      this.exceptionLogRepo.findByWoId(woId),
      this.outboxRepo.findByAggregateId(woId),
    ]);

    return {
      wo,
      sessions,
      sessionSummary: {
        totalQtyKg: sessionSummary.totalQtyKg.toString(),
        totalBagCount: sessionSummary.totalBagCount,
        totalWorkHours: sessionSummary.totalWorkHours?.toString() || null,
        sessionCount: sessionSummary.sessionCount,
        overtimeSessionCount: sessionSummary.overtimeSessionCount,
      },
      stateHistory,
      exceptions,
      outboxEvents,
    };
  }

  async list(query: QueryVasWoDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { data, total } = await this.woRepo.findMany({
      warehouseId: query.warehouseId,
      ownerId: query.ownerId,
      status: query.status as any,
      bulkSourceItemId: query.bulkSourceItemId,
      baggedOutputItemId: query.baggedOutputItemId,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      completedFrom: query.completedFrom ? new Date(query.completedFrom) : undefined,
      completedTo: query.completedTo ? new Date(query.completedTo) : undefined,
      keyword: query.keyword,
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSessions(woId: string) {
    const wo = await this.woRepo.findById(woId);
    if (!wo) throw new VasWoNotFoundError(woId);
    return this.sessionRepo.findByWoId(woId);
  }

  async getHistory(woId: string) {
    const wo = await this.woRepo.findById(woId);
    if (!wo) throw new VasWoNotFoundError(woId);
    return this.stateHistoryRepo.findByWoId(woId);
  }

  async getDashboard() {
    // Get work order counts by status
    const { data: allWos } = await this.woRepo.findMany({ take: 1000 });
    
    const statusCounts = {
      draftCount: 0,
      confirmedCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    };

    let totalBagsToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const wo of allWos) {
      switch (wo.status) {
        case 'DRAFT':
          statusCounts.draftCount++;
          break;
        case 'CONFIRMED':
          statusCounts.confirmedCount++;
          break;
        case 'IN_PROGRESS':
          statusCounts.inProgressCount++;
          break;
        case 'COMPLETED':
          statusCounts.completedCount++;
          break;
        case 'CANCELLED':
          statusCounts.cancelledCount++;
          break;
      }

      // Sum bags produced today
      if (wo.createdAt >= today) {
        totalBagsToday += wo.actualBagCount || 0;
      }
    }

    // Active sessions = IN_PROGRESS work orders count
    const activeSessions = statusCounts.inProgressCount;

    return {
      totalWorkOrders: allWos.length,
      ...statusCounts,
      activeSessions,
      totalBagsToday,
    };
  }
}
