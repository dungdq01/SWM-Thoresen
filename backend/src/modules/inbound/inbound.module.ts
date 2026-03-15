import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { ReceiptController } from './controllers/receipt.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { InboundDocumentController } from './controllers/inbound-document.controller';
import { ReceiptService } from './services/receipt.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { InboundDocumentService } from './services/inbound-document.service';

@Module({
  imports: [FoundationModule],
  controllers: [ReceiptController, PurchaseOrderController, InboundDocumentController],
  providers: [ReceiptService, PurchaseOrderService, InboundDocumentService],
  exports: [ReceiptService, PurchaseOrderService, InboundDocumentService],
})
export class InboundModule {}
