import { Module } from '@nestjs/common';
import { MoveOrderController } from './controllers/move-order.controller.nest';
import { TransferOrderController } from './controllers/transfer-order.controller.nest';
import { StatusChangeController } from './controllers/status-change.controller.nest';
import { CycleCountController } from './controllers/cycle-count.controller.nest';
import { AdjustmentController } from './controllers/adjustment.controller.nest';
import { MovementHistoryController } from './controllers/movement-history.controller.nest';
import { MoveOrderService } from './services/move-order.service.nest';
import { TransferOrderService } from './services/transfer-order.service.nest';
import { StatusChangeService } from './services/status-change.service.nest';
import { CycleCountService } from './services/cycle-count.service.nest';
import { AdjustmentService } from './services/adjustment.service.nest';
import { MovementHistoryService } from './services/movement-history.service.nest';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    MoveOrderController,
    TransferOrderController,
    StatusChangeController,
    CycleCountController,
    AdjustmentController,
    MovementHistoryController,
  ],
  providers: [
    MoveOrderService,
    TransferOrderService,
    StatusChangeService,
    CycleCountService,
    AdjustmentService,
    MovementHistoryService,
  ],
  exports: [
    MoveOrderService,
    TransferOrderService,
    StatusChangeService,
    CycleCountService,
    AdjustmentService,
    MovementHistoryService,
  ],
})
export class InventoryControlModule {}
