import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';

/**
 * Module 5: Outbound Operations
 * 
 * Sales Order Management:
 * - Tạo đơn xuất hàng (SO)
 * - Quản lý trạng thái SO
 * - Xác nhận, hủy, đóng SO
 */
@Module({
  imports: [],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
  exports: [SalesOrderService],
})
export class OutboundModule {}
