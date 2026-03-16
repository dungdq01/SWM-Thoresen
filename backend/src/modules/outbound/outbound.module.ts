import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { SimpleShipmentController } from './controllers/simple-shipment.controller';
import { SimpleShipmentService } from './services/simple-shipment.service';

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
 */
@Module({
  imports: [],
  controllers: [SalesOrderController, SimpleShipmentController],
  providers: [SalesOrderService, SimpleShipmentService],
  exports: [SalesOrderService, SimpleShipmentService],
})
export class OutboundModule {}
