/**
 * SO Qty Rollup Service
 * 
 * Per spec v5.1 GAP-01c:
 * When shipment lines are shipped, their shipped quantities must be
 * rolled up (aggregated) back to the parent SalesOrderLine.
 * 
 * Flow: ShipmentLine.shippedQty → aggregate by soLineId → SalesOrderLine.totalShippedQty + shippedQtyKg
 *       → aggregate to SalesOrder.totalShippedQtyKg
 *       → auto-close SO line if fully shipped
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface RollupResult {
  salesOrderId: string;
  soNumber: string;
  linesUpdated: number;
  totalShippedQtyKg: number;
  autoClosedLines: number;
  soAutoCompleted: boolean;
}

@Injectable()
export class SoQtyRollupService {
  private readonly logger = new Logger(SoQtyRollupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rollup shipped quantities from ShipmentLines → SalesOrderLines → SalesOrder
   * Called after a shipment transitions to SHIPPED status.
   */
  async rollupFromShipment(shipmentId: string): Promise<RollupResult | null> {
    const shipment = await this.prisma.shipmentHeader.findUnique({
      where: { id: shipmentId },
      include: {
        lines: true,
        salesOrder: { include: { lines: true } },
      },
    });

    if (!shipment || !shipment.salesOrderId || !shipment.salesOrder) {
      this.logger.warn(`Shipment ${shipmentId} has no linked SO — skipping rollup`);
      return null;
    }

    const so = shipment.salesOrder;
    let linesUpdated = 0;
    let autoClosedLines = 0;

    // Group shipped lines by soLineId
    const soLineShippedMap = new Map<string, number>();

    for (const line of shipment.lines) {
      if (!line.soLineId) continue;
      const shipped = Number(line.shippedQty || line.netWeightKg || 0);
      const current = soLineShippedMap.get(line.soLineId) || 0;
      soLineShippedMap.set(line.soLineId, current + shipped);
    }

    // For each SO line, recalculate totalShippedQty from ALL shipment lines
    for (const soLine of so.lines) {
      // Sum shipped qty across ALL shipments for this SO line (not just current shipment)
      const allShipmentLines = await this.prisma.shipmentLine.findMany({
        where: {
          soLineId: soLine.id,
          lineStatus: 'LINE_SHIPPED',
        },
        select: { shippedQty: true, netWeightKg: true },
      });

      const totalShippedQty = allShipmentLines.reduce(
        (sum, sl) => sum + Number(sl.shippedQty || sl.netWeightKg || 0),
        0,
      );

      const totalShippedQtyKg = totalShippedQty; // Already in KG from shipment line

      // Update SO line
      const updateData: any = {
        totalShippedQty: totalShippedQty,
        shippedQtyKg: totalShippedQtyKg,
      };

      // Auto-close if fully shipped (within 1% tolerance)
      const expectedKg = Number(soLine.expectedQtyKg || 0);
      if (expectedKg > 0 && totalShippedQtyKg >= expectedKg * 0.99) {
        updateData.status = 'SHIPPED';
        autoClosedLines++;
      }

      await this.prisma.salesOrderLine.update({
        where: { id: soLine.id },
        data: updateData,
      });

      linesUpdated++;
    }

    // Recalculate SO totals
    const updatedSoLines = await this.prisma.salesOrderLine.findMany({
      where: { soId: so.id },
      select: { shippedQtyKg: true, status: true },
    });

    const soTotalShippedKg = updatedSoLines.reduce(
      (sum, l) => sum + Number(l.shippedQtyKg || 0),
      0,
    );

    const allLinesShipped = updatedSoLines.every(
      (l) => l.status === 'SHIPPED' || l.status === 'CANCELLED',
    );

    const soUpdateData: any = {
      totalShippedQtyKg: soTotalShippedKg,
    };

    // Auto-complete SO if all lines shipped
    let soAutoCompleted = false;
    if (allLinesShipped && so.status !== 'CLOSED' && so.status !== 'CANCELLED') {
      soUpdateData.status = 'SHIPPED';
      soAutoCompleted = true;
    }

    await this.prisma.salesOrder.update({
      where: { id: so.id },
      data: soUpdateData,
    });

    this.logger.log(
      `SO rollup: ${so.soNumber} — ${linesUpdated} lines updated, ${soTotalShippedKg}kg total shipped` +
        (soAutoCompleted ? ' → SO auto-completed' : ''),
    );

    return {
      salesOrderId: so.id,
      soNumber: so.soNumber,
      linesUpdated,
      totalShippedQtyKg: soTotalShippedKg,
      autoClosedLines,
      soAutoCompleted,
    };
  }

  /**
   * Recalculate rollup for a specific SO (manual trigger)
   */
  async recalculateSo(salesOrderId: string): Promise<RollupResult | null> {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { lines: true, shipmentHeaders: { select: { id: true } } },
    });

    if (!so) return null;

    // Find all shipped shipments for this SO
    const shippedShipments = await this.prisma.shipmentHeader.findMany({
      where: { salesOrderId, status: 'SHIPPED' },
      select: { id: true },
    });

    // Process each SO line
    let linesUpdated = 0;
    let autoClosedLines = 0;

    for (const soLine of so.lines) {
      const allShipmentLines = await this.prisma.shipmentLine.findMany({
        where: {
          soLineId: soLine.id,
          lineStatus: 'LINE_SHIPPED',
        },
        select: { shippedQty: true, netWeightKg: true },
      });

      const totalShippedQty = allShipmentLines.reduce(
        (sum, sl) => sum + Number(sl.shippedQty || sl.netWeightKg || 0),
        0,
      );

      const updateData: any = {
        totalShippedQty,
        shippedQtyKg: totalShippedQty,
      };

      const expectedKg = Number(soLine.expectedQtyKg || 0);
      if (expectedKg > 0 && totalShippedQty >= expectedKg * 0.99) {
        updateData.status = 'SHIPPED';
        autoClosedLines++;
      }

      await this.prisma.salesOrderLine.update({
        where: { id: soLine.id },
        data: updateData,
      });

      linesUpdated++;
    }

    // SO totals
    const updatedLines = await this.prisma.salesOrderLine.findMany({
      where: { soId: so.id },
      select: { shippedQtyKg: true, status: true },
    });

    const soTotalShippedKg = updatedLines.reduce(
      (sum, l) => sum + Number(l.shippedQtyKg || 0),
      0,
    );

    const allDone = updatedLines.every(
      (l) => l.status === 'SHIPPED' || l.status === 'CANCELLED',
    );

    let soAutoCompleted = false;
    if (allDone && so.status !== 'CLOSED' && so.status !== 'CANCELLED') {
      await this.prisma.salesOrder.update({
        where: { id: so.id },
        data: { totalShippedQtyKg: soTotalShippedKg, status: 'SHIPPED' },
      });
      soAutoCompleted = true;
    } else {
      await this.prisma.salesOrder.update({
        where: { id: so.id },
        data: { totalShippedQtyKg: soTotalShippedKg },
      });
    }

    return {
      salesOrderId: so.id,
      soNumber: so.soNumber,
      linesUpdated,
      totalShippedQtyKg: soTotalShippedKg,
      autoClosedLines,
      soAutoCompleted,
    };
  }
}
