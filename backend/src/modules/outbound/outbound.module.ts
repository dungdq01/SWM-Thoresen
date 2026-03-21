import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { SimpleShipmentController } from './controllers/simple-shipment.controller';
import { SimpleShipmentService } from './services/simple-shipment.service';
import { OutboundDocumentController } from './controllers/outbound-document.controller';
import { OutboundDocumentService } from './services/outbound-document.service';
import { PostShipResidualService } from './services/post-ship-residual.service';
import { SoQtyRollupService } from './services/so-qty-rollup.service';

/**
 * Module 5: Outbound Operations
 * 
 * Sales Order Management:
 * - Tạo đơn xuất hàng (SO)
 * - Quản lý trạng thái SO
 * - Xác nhận, hủy, đóng SO
 * 
 * Shipment Management:
 * - Tạo phiếu xuất từ SO
 * - Quản lý danh sách phiếu xuất
 * 
 * Outbound Documents:
 * - Chứng từ xuất (phiếu cân, B/L, packing list...)
 * - OCR auto-link tạo chứng từ tự động
 */
@Module({
  imports: [],
  controllers: [SalesOrderController, SimpleShipmentController, OutboundDocumentController],
  providers: [SalesOrderService, SimpleShipmentService, OutboundDocumentService, PostShipResidualService, SoQtyRollupService],
  exports: [SalesOrderService, SimpleShipmentService, OutboundDocumentService, PostShipResidualService, SoQtyRollupService],
})
export class OutboundModule {}
