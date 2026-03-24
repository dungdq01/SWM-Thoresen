import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ShipmentStateMachineService } from './shipment-state-machine.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { v4 as uuidv4 } from 'uuid';


export interface CreateShipmentParams extends CreateShipmentDto {
  correlationId?: string;
  createdBy?: string;
  sourceApp?: string;
}

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly statusHistoryRepo: StatusHistoryRepository,
    private readonly stateMachine: ShipmentStateMachineService,
  ) {}

  async create(params: CreateShipmentParams) {
    const existing = await this.headerRepo.findByExternalId(params.externalId);
    if (existing) {
      return existing;
    }

    const correlationId = params.correlationId || uuidv4();

    const isDpmShipment = params.lines.some(
      (line) => line.bagCount && line.nominalWeightPerBag,
    );

    const shipment = await this.headerRepo.create({
      externalId: params.externalId,
      sourceType: params.sourceType as any,
      soId: params.soId,
      owner: { connect: { id: params.ownerId } },
      warehouse: { connect: { id: params.warehouseId } },
      vehicleNumber: params.vehicleNumber,
      ...(params.vehicleTypeId && {
        vehicleType: { connect: { id: params.vehicleTypeId } },
      }),
      status: 'DRAFT',
      isDpmShipment,
      correlationId,
      sourceApp: (params.sourceApp as any) || 'WEB',
      createdBy: params.createdBy,
    });

    const lineData = params.lines.map((line, index) => ({
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
      createdBy: params.createdBy,
    }));

    await this.lineRepo.createMany(shipment.id, lineData);

    await this.statusHistoryRepo.create({
      shipmentHeaderId: shipment.id,
      entityLevel: 'HEADER',
      toStatus: 'DRAFT',
      triggerAction: 'CREATE',
      changedBy: params.createdBy,
      correlationId,
    });

    return this.headerRepo.findById(shipment.id);
  }

  async findById(id: string) {
    const shipment = await this.headerRepo.findById(id);
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return shipment;
  }

  async findByExternalId(externalId: string) {
    return this.headerRepo.findByExternalId(externalId);
  }

  async confirm(id: string, userId?: string, correlationId?: string) {
    const shipment = await this.findById(id);
    
    this.stateMachine.assertCanTransition(shipment.status as any, 'CONFIRM');

    if (!(shipment as any).lines || (shipment as any).lines.length === 0) {
      throw new BadRequestException('Cannot confirm shipment without lines');
    }

    const corrId = correlationId || uuidv4();

    const updated = await this.headerRepo.updateStatus(id, 'CONFIRMED', {
      updatedBy: userId,
    });

    await this.statusHistoryRepo.create({
      shipmentHeaderId: id,
      entityLevel: 'HEADER',
      fromStatus: 'DRAFT',
      toStatus: 'CONFIRMED',
      triggerAction: 'CONFIRM',
      changedBy: userId,
      correlationId: corrId,
    });

    return this.findById(id);
  }

  async cancel(id: string, reasonCode: string, userId?: string, correlationId?: string) {
    const shipment = await this.findById(id);

    if (!this.stateMachine.canCancel(shipment.status as any)) {
      throw new BadRequestException(
        `Cannot cancel shipment in ${shipment.status} status`,
      );
    }

    const corrId = correlationId || uuidv4();
    const fromStatus = shipment.status;

    await this.headerRepo.updateStatus(id, 'CANCELLED', {
      cancelReasonCode: reasonCode,
      updatedBy: userId,
    });

    await this.statusHistoryRepo.create({
      shipmentHeaderId: id,
      entityLevel: 'HEADER',
      fromStatus,
      toStatus: 'CANCELLED',
      triggerAction: 'CANCEL',
      reasonCode,
      changedBy: userId,
      correlationId: corrId,
    });

    return this.findById(id);
  }

  async updateStatus(
    id: string,
    action: string,
    additionalData?: Record<string, unknown>,
    userId?: string,
    correlationId?: string,
  ) {
    const shipment = await this.findById(id);
    const fromStatus = shipment.status;
    
    this.stateMachine.assertCanTransition(fromStatus as any, action);
    const nextStatus = this.stateMachine.getNextStatus(fromStatus as any, action);

    if (!nextStatus) {
      throw new BadRequestException(`Invalid action ${action}`);
    }

    const corrId = correlationId || uuidv4();

    await this.headerRepo.updateStatus(id, nextStatus as any, {
      ...additionalData,
      updatedBy: userId,
    });

    await this.statusHistoryRepo.create({
      shipmentHeaderId: id,
      entityLevel: 'HEADER',
      fromStatus,
      toStatus: nextStatus,
      triggerAction: action,
      changedBy: userId,
      correlationId: corrId,
    });

    return this.findById(id);
  }
}
