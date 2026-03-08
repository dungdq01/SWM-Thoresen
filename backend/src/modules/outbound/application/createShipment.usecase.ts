/**
 * Create Shipment Use Case - Application Layer
 * Handles shipment creation with idempotency
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CreateShipmentInput extends CreateShipmentDto {
  correlationId?: string;
  createdBy?: string;
  sourceApp?: string;
}

@Injectable()
export class CreateShipmentUseCase {
  constructor(
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly historyRepo: StatusHistoryRepository,
  ) {}

  async execute(input: CreateShipmentInput) {
    const existing = await this.headerRepo.findByExternalId(input.externalId);
    if (existing) {
      return existing;
    }

    const correlationId = input.correlationId || uuidv4();

    const isDpmShipment = input.lines.some(
      (line) => line.bagCount && line.nominalWeightPerBag,
    );

    if (input.lines.length === 0) {
      throw new BadRequestException('Shipment must have at least one line');
    }

    const shipment = await this.headerRepo.create({
      externalId: input.externalId,
      sourceType: input.sourceType as any,
      soId: input.soId,
      owner: { connect: { id: input.ownerId } },
      warehouse: { connect: { id: input.warehouseId } },
      vehicleNumber: input.vehicleNumber,
      ...(input.vehicleTypeId && {
        vehicleType: { connect: { id: input.vehicleTypeId } },
      }),
      status: 'DRAFT',
      isDpmShipment,
      correlationId,
      sourceApp: (input.sourceApp as any) || 'WEB',
      createdBy: input.createdBy,
    });

    const lineData = input.lines.map((line, index) => ({
      shipmentHeaderId: shipment.id,
      lineNumber: index + 1,
      soLineId: line.soLineId,
      itemId: line.itemId,
      cargoForm: line.cargoForm as any,
      uomId: line.uomId,
      expectedQty: line.expectedQty,
      expectedQtyKg: line.expectedQtyKg,
      bagCount: line.bagCount,
      nominalWeightPerBag: line.nominalWeightPerBag,
      isDpmLine: !!(line.bagCount && line.nominalWeightPerBag),
      dpmNominalQtyKg: line.bagCount && line.nominalWeightPerBag
        ? line.bagCount * line.nominalWeightPerBag
        : null,
      lineStatus: 'PENDING' as const,
      createdBy: input.createdBy,
    }));

    await this.lineRepo.createMany(shipment.id, lineData);

    await this.historyRepo.create({
      shipmentHeaderId: shipment.id,
      entityLevel: 'HEADER',
      toStatus: 'DRAFT',
      triggerAction: 'CREATE',
      changedBy: input.createdBy,
      correlationId,
    });

    return this.headerRepo.findById(shipment.id);
  }
}
