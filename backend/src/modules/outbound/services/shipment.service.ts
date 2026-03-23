import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ShipmentStateMachineService } from './shipment-state-machine.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReversalEngineService } = require('../../inventory-core/application/reversal-engine.service');

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

    // Post SO_CONFIRMED to M3 for each line → increases outboundOrderedQty at SHP warehouse
    try {
      const postingEngine = new PostingEngineService(this.prisma);
      const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: params.warehouseId } });
      const owner = await this.prisma.mdOwner.findUnique({ where: { id: params.ownerId } });
      const firstLocation = await this.prisma.mdLocation.findFirst({
        where: { warehouseId: params.warehouseId, isActive: true },
        orderBy: { locationCode: 'asc' },
      });
      const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });

      for (const line of lineData) {
        // Convert qty to KG
        let qtyKg = Number(line.expectedQty || 0);
        if (line.uomId && kgUom && line.uomId !== kgUom.id) {
          let conversion = await this.prisma.mdUomConversion.findFirst({
            where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
          });
          if (!conversion) {
            conversion = await this.prisma.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
            });
          }
          if (conversion) {
            qtyKg = Number(line.expectedQty || 0) * Number(conversion.conversionFactor);
          }
        }
        // Use expectedQtyKg if already converted
        if (line.expectedQtyKg && Number(line.expectedQtyKg) > 0) {
          qtyKg = Number(line.expectedQtyKg);
        }

        await postingEngine.postInventory({
          externalId: `SHP-CREATE-${shipment.id}-${line.itemId}-${Date.now()}`,
          correlationId,
          eventCode: 'SO_CONFIRMED',
          refType: 'SHIPMENT',
          refId: shipment.id,
          refLineId: line.soLineId || line.itemId,
          itemId: line.itemId,
          qty: String(qtyKg),
          uomCode: 'KG',
          dimFrom: {
            warehouseCode: warehouse?.warehouseCode,
            locationCode: firstLocation?.locationCode || 'SHIPPING',
            ownerCode: owner?.ownerCode,
            statusCode: 'AVAILABLE',
          },
          sourceApp: 'SYSTEM',
          postedBy: params.createdBy,
        });
      }
    } catch (err: any) {
      console.error(`[M5→M3] SHP SO_CONFIRMED posting failed for SHP ${shipment.id} (non-blocking):`, err.message);
    }

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

    if (!shipment.lines || shipment.lines.length === 0) {
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

    // Reverse M3 SO_CONFIRMED postings for this SHP → decreases outboundOrderedQty
    try {
      const reversalEngine = new ReversalEngineService(this.prisma);
      const transactions = await this.prisma.inventTrans.findMany({
        where: { refId: id, stage: 'EXPECTED', isReversal: false },
      });
      for (const trans of transactions) {
        // Skip if already reversed
        const existingReversal = await this.prisma.inventoryReversalLink.findFirst({
          where: { originalTransId: trans.id },
        });
        if (existingReversal) continue;

        await reversalEngine.reverse({
          externalId: `SHP-CANCEL-REV-${id}-${trans.transId}-${Date.now()}`,
          correlationId: corrId,
          originalTransId: trans.transId,
          reasonCode: reasonCode || 'SHIPMENT_CANCELLED',
          note: `SHP cancelled`,
          sourceApp: 'SYSTEM',
          postedBy: userId,
        });
      }
    } catch (err: any) {
      console.error(`[M5→M3] SHP cancel reversal failed for SHP ${id} (non-blocking):`, err.message);
    }

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
