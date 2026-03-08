import { Injectable } from '@nestjs/common';
import { ShipmentHeaderRepository, ShipmentFilterParams } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
import { WeighingAttemptRepository } from '../repositories/weighing-attempt.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';

@Injectable()
export class ShipmentQueryService {
  constructor(
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly allocationRepo: AllocationRecordRepository,
    private readonly weighingRepo: WeighingAttemptRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly exceptionRepo: ExceptionLogRepository,
  ) {}

  async findById(id: string) {
    return this.headerRepo.findById(id);
  }

  async findByExternalId(externalId: string) {
    return this.headerRepo.findByExternalId(externalId);
  }

  async findByShipmentNumber(shipmentNumber: string) {
    return this.headerRepo.findByShipmentNumber(shipmentNumber);
  }

  async list(params: ShipmentFilterParams) {
    return this.headerRepo.findMany(params);
  }

  async getLines(shipmentId: string) {
    return this.lineRepo.findByShipmentId(shipmentId);
  }

  async getAllocations(shipmentId: string) {
    return this.allocationRepo.findByShipmentId(shipmentId);
  }

  async getLineAllocations(lineId: string) {
    return this.allocationRepo.findByLineId(lineId);
  }

  async getWeighingHistory(shipmentId: string) {
    return this.weighingRepo.findByShipmentId(shipmentId);
  }

  async getStatusHistory(shipmentId: string) {
    return this.historyRepo.findByShipmentId(shipmentId);
  }

  async getExceptions(shipmentId: string) {
    return this.exceptionRepo.findByShipmentId(shipmentId);
  }

  async getOpenExceptions(shipmentId: string) {
    return this.exceptionRepo.findOpenByShipmentId(shipmentId);
  }

  async getDashboardSummary(warehouseId?: string) {
    return this.headerRepo.getDashboardSummary(warehouseId);
  }

  async getPendingApprovals(warehouseId?: string) {
    return this.headerRepo.findMany({
      status: 'PENDING_APPROVAL' as any,
      warehouseId,
      page: 1,
      pageSize: 100,
    });
  }
}
