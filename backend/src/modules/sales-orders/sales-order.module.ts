import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderNestService } from './services/sales-order.service';

@Module({
  imports: [FoundationModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderNestService],
  exports: [SalesOrderNestService],
})
export class SalesOrderModule {}
