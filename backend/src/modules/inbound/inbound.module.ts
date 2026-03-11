import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { ReceiptController } from './controllers/receipt.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { ReceiptService } from './services/receipt.service';
import { PurchaseOrderService } from './services/purchase-order.service';

@Module({
  imports: [FoundationModule],
  controllers: [ReceiptController, PurchaseOrderController],
  providers: [ReceiptService, PurchaseOrderService],
  exports: [ReceiptService, PurchaseOrderService],
})
export class InboundModule {}
