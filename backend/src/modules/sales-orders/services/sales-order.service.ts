import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  CancelSalesOrderDto,
  CloseSalesOrderDto,
  ReleaseShipmentDto,
  SalesOrderQueryDto,
  DashboardQueryDto,
} from '../dto/sales-order.dto';

// Import JS module
const { SalesOrderService: LegacySalesOrderService } = require('../application/sales-order.service');
const { SalesOrderError } = require('../domain/sales-order.errors');

const isValidUUID = (str: string | null | undefined): boolean =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

@Injectable()
export class SalesOrderNestService {
  private legacyService: any;

  constructor(private readonly prisma: PrismaService) {
    this.legacyService = new LegacySalesOrderService(prisma);
  }

  private resolveUserId(userId: string | null | undefined): string | null {
    return userId && isValidUUID(userId) ? userId : null;
  }

  async getNextSoNumber(): Promise<{ code: string; prefix: string }> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SO-${today}-`;
    const last = await this.prisma.salesOrder.findFirst({
      where: { soNumber: { startsWith: prefix } },
      orderBy: { soNumber: 'desc' },
      select: { soNumber: true },
    });
    const lastSeq = last ? parseInt(last.soNumber.replace(prefix, ''), 10) : 0;
    const nextSeq = String(lastSeq + 1).padStart(6, '0');
    return { code: `${prefix}${nextSeq}`, prefix: 'SO' };
  }

  async create(dto: CreateSalesOrderDto, userId: string) {
    try {
      const externalId = dto.externalId || `so-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const payload = { ...dto, externalId };
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.createSalesOrder(payload, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(query: SalesOrderQueryDto) {
    const { page = 1, pageSize = 20, ...filters } = query;
    return this.legacyService.listSalesOrders({ page, pageSize, filters });
  }

  async getById(id: string) {
    try {
      return await this.legacyService.getSalesOrder(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, dto: UpdateSalesOrderDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.updateSalesOrder(id, dto, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async confirm(id: string, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.confirmSalesOrder(id, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(id: string, dto: CancelSalesOrderDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.cancelSalesOrder(id, dto, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async close(id: string, dto: CloseSalesOrderDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.closeSalesOrder(id, dto, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async releaseShipment(id: string, dto: ReleaseShipmentDto, userId: string) {
    try {
      const context = { userId: this.resolveUserId(userId), correlationId: `corr-${Date.now()}` };
      return await this.legacyService.releaseShipment(id, dto, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getFulfillment(id: string) {
    try {
      return await this.legacyService.getFulfillment(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getShipments(id: string) {
    try {
      return await this.legacyService.getLinkedShipments(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getHistory(id: string) {
    try {
      return await this.legacyService.getStatusHistory(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDashboardSummary(query: DashboardQueryDto) {
    return this.legacyService.getDashboardSummary(query);
  }

  /**
   * Callback for Outbound module when shipment status changes
   */
  async onShipmentStatusChanged(shipmentId: string, newStatus: string, userId?: string) {
    try {
      const context = { userId: this.resolveUserId(userId) };
      return await this.legacyService.onShipmentStatusChanged(shipmentId, newStatus, context);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (error instanceof SalesOrderError) {
      if (error.httpStatus === 404) {
        throw new NotFoundException(error.message);
      }
      if (error.httpStatus === 409) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
