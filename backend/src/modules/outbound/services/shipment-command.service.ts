import { Injectable } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { AllocationService } from './allocation.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';

@Injectable()
export class ShipmentCommandService {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly allocationService: AllocationService,
  ) {}

  async createShipment(dto: CreateShipmentDto, userId?: string, correlationId?: string) {
    return this.shipmentService.create({
      ...dto,
      createdBy: userId,
      correlationId,
    });
  }

  async confirmShipment(shipmentId: string, userId?: string, correlationId?: string) {
    return this.shipmentService.confirm(shipmentId, userId, correlationId);
  }

  async cancelShipment(
    shipmentId: string,
    reasonCode: string,
    userId?: string,
    correlationId?: string,
  ) {
    const shipment = await this.shipmentService.findById(shipmentId);

    if (shipment.status === 'ALLOCATED') {
      await this.allocationService.releaseAll(shipmentId, userId, correlationId);
    }

    return this.shipmentService.cancel(shipmentId, reasonCode, userId, correlationId);
  }

  async allocateShipment(shipmentId: string, userId?: string, correlationId?: string) {
    return this.allocationService.allocateShipment(shipmentId, userId, correlationId);
  }

  async unallocateShipment(shipmentId: string, userId?: string, correlationId?: string) {
    return this.allocationService.releaseAll(shipmentId, userId, correlationId);
  }
}
