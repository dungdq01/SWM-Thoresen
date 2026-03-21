/**
 * Post-Ship Residual Handling Service
 * 
 * Per spec v5.1 GAP-01d:
 * When a shipment is shipped and there's a variance between weighed/loaded qty
 * and allocated qty, the residual must be returned through the pipeline:
 *   SHIPPING zone → STAGING zone → STORAGE zone
 * 
 * This creates the appropriate inventory transactions (InventTrans) to move
 * residual quantities back into available stock.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface ResidualResult {
  shipmentId: string;
  linesProcessed: number;
  residualLines: {
    lineId: string;
    itemId: string;
    allocatedQty: number;
    shippedQty: number;
    residualQty: number;
    returnTransId: string | null;
  }[];
  totalResidualKg: number;
}

@Injectable()
export class PostShipResidualService {
  private readonly logger = new Logger(PostShipResidualService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process residual quantities after shipment is SHIPPED.
   * For each line: residual = allocatedQty - shippedQty (or weighedQtyKg if no shippedQty)
   * If residual > 0, create a RETURN inventory transaction to move qty back to STORAGE.
   */
  async processResiduals(
    shipmentId: string,
    userId?: string,
  ): Promise<ResidualResult> {
    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id: shipmentId },
      include: {
        lines: {
          include: {
            item: true,
            uom: true,
            allocationRecords: {
              include: {
                inventDim: {
                  include: {
                    warehouse: true,
                    location: true,
                    owner: true,
                    inventoryStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    if (shipment.status !== 'SHIPPED') {
      throw new Error(`Shipment must be SHIPPED to process residuals. Current: ${shipment.status}`);
    }

    const correlationId = `RESIDUAL-${shipmentId}-${uuidv4().slice(0, 8)}`;
    const residualLines: ResidualResult['residualLines'] = [];
    let totalResidualKg = 0;

    for (const line of shipment.lines) {
      const allocatedQty = Number(line.allocatedQty || 0);
      const shippedQty = Number(line.shippedQty || line.weighedQtyKg || 0);

      if (allocatedQty <= 0 || shippedQty >= allocatedQty) {
        // No residual — shipped >= allocated
        residualLines.push({
          lineId: line.id,
          itemId: line.itemId,
          allocatedQty,
          shippedQty,
          residualQty: 0,
          returnTransId: null,
        });
        continue;
      }

      const residualQty = allocatedQty - shippedQty;
      totalResidualKg += residualQty;
      let returnTransId: string | null = null;

      // Find the allocation records that were used for this line
      const allocations = line.allocationRecords || [];

      if (allocations.length > 0) {
        // Create return transaction for the residual qty
        // Uses the LAST allocation's dim (LIFO return — return from most recent allocation first)
        const lastAlloc = allocations[allocations.length - 1];

        if (lastAlloc.inventDimId) {
          try {
            const transId = `RTN-${uuidv4().slice(0, 12)}`;
            const externalId = `RESIDUAL-${shipmentId}-${line.id}-${uuidv4().slice(0, 8)}`;

            const trans = await this.prisma.inventTrans.create({
              data: {
                transId,
                refType: 'SHIPMENT_RESIDUAL',
                refId: shipmentId,
                refLineId: line.id,
                transType: 'RESIDUAL_RETURN',
                itemId: line.itemId,
                qty: residualQty,
                uomId: line.uomId,
                dimToId: lastAlloc.inventDimId,
                stage: 'PHYSICAL',
                externalId,
                correlationId,
                sourceApp: 'SYSTEM',
                postedBy: userId || null,
                postedAt: new Date(),
                ownerId: shipment.ownerId,
              },
            });

            returnTransId = trans.transId;

            // Update OnHand — add back the residual qty
            await this.prisma.onHand.updateMany({
              where: {
                itemId: line.itemId,
                inventDimId: lastAlloc.inventDimId,
              },
              data: {
                physicalQty: { increment: residualQty },
                availableQty: { increment: residualQty },
                lastMovementAt: new Date(),
              },
            });

            this.logger.log(
              `Residual return: line=${line.id}, qty=${residualQty}kg, trans=${transId}`,
            );
          } catch (err) {
            this.logger.error(
              `Failed to create residual return for line ${line.id}: ${(err as Error).message}`,
            );
          }
        }
      }

      residualLines.push({
        lineId: line.id,
        itemId: line.itemId,
        allocatedQty,
        shippedQty,
        residualQty,
        returnTransId,
      });
    }

    // Log summary
    if (totalResidualKg > 0) {
      this.logger.log(
        `Shipment ${shipmentId}: ${totalResidualKg}kg residual returned across ${
          residualLines.filter((r) => r.residualQty > 0).length
        } lines`,
      );
    }

    return {
      shipmentId,
      linesProcessed: shipment.lines.length,
      residualLines,
      totalResidualKg,
    };
  }

  /**
   * Check if a shipment has unprocessed residuals
   * Returns true if any line has allocated > shipped and no RESIDUAL trans exists
   */
  async hasUnprocessedResiduals(shipmentId: string): Promise<boolean> {
    const lines = await this.prisma.shipmentLine.findMany({
      where: { shipmentHeaderId: shipmentId },
      select: { id: true, allocatedQty: true, shippedQty: true, weighedQtyKg: true },
    });

    for (const line of lines) {
      const allocated = Number(line.allocatedQty || 0);
      const shipped = Number(line.shippedQty || line.weighedQtyKg || 0);

      if (allocated > shipped) {
        // Check if residual trans already exists
        const existingTrans = await this.prisma.inventTrans.findFirst({
          where: {
            refType: 'SHIPMENT_RESIDUAL',
            refId: shipmentId,
            refLineId: line.id,
          },
        });

        if (!existingTrans) return true;
      }
    }

    return false;
  }
}
