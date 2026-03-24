import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { SimpleShipmentController } from './controllers/simple-shipment.controller';
import { SimpleShipmentService } from './services/simple-shipment.service';
import { OutboundDocumentController } from './controllers/outbound-document.controller';
import { OutboundDocumentService } from './services/outbound-document.service';
import { LoadingController } from './controllers/loading.controller';
import { LoadingService } from './services/loading.service';
import { PostShipResidualService } from './services/post-ship-residual.service';
import { SoQtyRollupService } from './services/so-qty-rollup.service';
import { ShipmentHeaderRepository } from './repositories/shipment-header.repository';
import { ShipmentLineRepository } from './repositories/shipment-line.repository';
import { StatusHistoryRepository } from './repositories/status-history.repository';
import { ShipmentStateMachineService } from './services/shipment-state-machine.service';

@Module({
  imports: [],
  controllers: [SalesOrderController, SimpleShipmentController, LoadingController, OutboundDocumentController],
  providers: [
    // Repositories
    ShipmentHeaderRepository,
    ShipmentLineRepository,
    StatusHistoryRepository,
    // Services
    ShipmentStateMachineService,
    SalesOrderService,
    SimpleShipmentService,
    LoadingService,
    OutboundDocumentService,
    PostShipResidualService,
    SoQtyRollupService,
  ],
  exports: [SalesOrderService, SimpleShipmentService, LoadingService, OutboundDocumentService, PostShipResidualService, SoQtyRollupService],
})
export class OutboundModule {}
