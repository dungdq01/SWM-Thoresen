import { Injectable } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { AllocateShipmentUseCase } from '../application/allocateShipment.usecase';
import { CreateShipmentDto } from '../dto/create-shipment.dto';

@Injectable()
export class ShipmentCommandService {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly allocateUseCase: AllocateShipmentUseCase,
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
      await this.allocateUseCase.releaseAll(shipmentId, userId, correlationId);
    }

    return this.shipmentService.cancel(shipmentId, reasonCode, userId, correlationId);
  }

  async allocateShipment(shipmentId: string, userId?: string, correlationId?: string) {
    return this.allocateUseCase.execute({ shipmentId, userId, correlationId });
  }

  async unallocateShipment(shipmentId: string, userId?: string, correlationId?: string) {
    return this.allocateUseCase.releaseAll(shipmentId, userId, correlationId);
  }
}
