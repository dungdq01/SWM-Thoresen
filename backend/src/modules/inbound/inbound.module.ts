import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { ReceiptController } from './controllers/receipt.controller';
import { ReceiptService } from './services/receipt.service';

@Module({
  imports: [FoundationModule],
  controllers: [ReceiptController],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class InboundModule {}
