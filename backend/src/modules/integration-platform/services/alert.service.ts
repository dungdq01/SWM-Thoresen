import { Injectable, Logger } from '@nestjs/common';
import { IntegrationAlertRepository } from '../repositories/integration-alert.repository';
import { AlertStatus, AlertSeverity } from '../domain/integration.enums';
import { IntegrationError, IntegrationErrorCodes } from '../domain/integration.errors';

export interface RaiseAlertParams {
  alertCode: string;
  alertSource: string;
  severity: string;
  sourceRefType?: string;
  sourceRefId?: string;
  title: string;
  description?: string;
  ownerRole?: string;
  warehouseId?: string;
  correlationId?: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly alertRepo: IntegrationAlertRepository) {}

  async raiseAlert(params: RaiseAlertParams) {
    const alert = await this.alertRepo.create({
      alertCode: params.alertCode,
      alertSource: params.alertSource,
      severity: params.severity as any,
      sourceRefType: params.sourceRefType,
      sourceRefId: params.sourceRefId,
      title: params.title,
      description: params.description,
      status: AlertStatus.OPEN,
      ownerRole: params.ownerRole,
      warehouseId: params.warehouseId,
      correlationId: params.correlationId,
      firstRaisedAt: new Date(),
      lastSeenAt: new Date(),
    });

    this.logger.log(`Alert raised: ${params.alertCode} - ${params.title}`);
    return alert;
  }

  async getAlerts(params: {
    alertSource?: string;
    severity?: string;
    status?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    // Read from database - map severity for frontend (CRITICAL/ERROR->HIGH, WARN->MEDIUM, INFO->LOW)
    const result = await this.alertRepo.findMany({
      alertSource: params.alertSource,
      severity: params.severity,
      status: params.status,
      warehouseId: params.warehouseId,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
    });

    // Map database fields to frontend expected format
    const mappedData = result.data.map((alert: any) => ({
      id: alert.id,
      title: alert.title,
      alertSource: alert.alertSource,
      severity: this.mapSeverity(alert.severity),
      message: alert.description,
      status: alert.status,
      createdAt: alert.createdAt,
    }));

    return {
      data: mappedData,
      pagination: {
        total: result.total,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(result.total / (params.limit || 20)),
      },
    };
  }

  private mapSeverity(dbSeverity: string): string {
    if (dbSeverity === 'CRITICAL' || dbSeverity === 'ERROR') return 'HIGH';
    if (dbSeverity === 'WARN') return 'MEDIUM';
    return 'LOW';
  }

  async getAlertById(id: string) {
    const alert = await this.alertRepo.findById(id);
    if (!alert) {
      throw new IntegrationError(
        IntegrationErrorCodes.ALERT_NOT_FOUND,
        `Alert with ID ${id} not found`,
      );
    }
    return alert;
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string) {
    const alert = await this.getAlertById(id);
    
    if (alert.status !== AlertStatus.OPEN) {
      throw new IntegrationError(
        IntegrationErrorCodes.INVALID_ALERT_STATUS,
        `Cannot acknowledge alert in status ${alert.status}`,
      );
    }

    const updated = await this.alertRepo.acknowledge(id, acknowledgedBy);
    this.logger.log(`Alert ${id} acknowledged by ${acknowledgedBy}`);
    return updated;
  }

  async resolveAlert(id: string, resolvedBy: string, resolutionNote: string) {
    const alert = await this.getAlertById(id);
    
    if (alert.status === AlertStatus.RESOLVED) {
      throw new IntegrationError(
        IntegrationErrorCodes.INVALID_ALERT_STATUS,
        'Alert is already resolved',
      );
    }

    if (alert.severity === AlertSeverity.CRITICAL && !resolutionNote) {
      throw new IntegrationError(
        IntegrationErrorCodes.RESOLUTION_NOTE_REQUIRED,
        'Resolution note is required for critical alerts',
      );
    }

    const updated = await this.alertRepo.resolve(id, resolvedBy, resolutionNote);
    this.logger.log(`Alert ${id} resolved by ${resolvedBy}`);
    return updated;
  }

  async getOpenAlerts() {
    return this.alertRepo.findOpenAlerts();
  }

  async getCriticalAlerts() {
    return this.alertRepo.findCriticalAlerts();
  }

  async getAlertStats() {
    const byStatusAndSeverity = await this.alertRepo.countByStatusAndSeverity();
    const openBySource = await this.alertRepo.countOpenBySource();

    return {
      byStatusAndSeverity,
      openBySource,
    };
  }
}
