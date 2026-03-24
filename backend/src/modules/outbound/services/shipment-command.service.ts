import { Injectable } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';

@Injectable()
export class ShipmentCommandService {
  constructor(
    private readonly shipmentService: ShipmentService,
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
    return this.shipmentService.cancel(shipmentId, reasonCode, userId, correlationId);
  }
}
