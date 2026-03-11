import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { ShipmentController } from './controllers/shipment.controller';
import { AllocationController } from './controllers/allocation.controller';
import { WeighingController } from './controllers/weighing.controller';
import { ApprovalController } from './controllers/approval.controller';
import { OutboundQueryController } from './controllers/outbound-query.controller';
import { ShipmentService } from './services/shipment.service';
import { ShipmentCommandService } from './services/shipment-command.service';
import { ShipmentQueryService } from './services/shipment-query.service';
import { ShipmentStateMachineService } from './services/shipment-state-machine.service';
import { ShipmentLineStateService } from './services/shipment-line-state.service';
import { AllocationService } from './services/allocation.service';
import { WeighingService } from './services/weighing.service';
import { ToleranceService } from './services/tolerance.service';
import { ApprovalService } from './services/approval.service';
import { ShipmentHeaderRepository } from './repositories/shipment-header.repository';
import { ShipmentLineRepository } from './repositories/shipment-line.repository';
import { AllocationRecordRepository } from './repositories/allocation-record.repository';
import { WeighingAttemptRepository } from './repositories/weighing-attempt.repository';
import { StatusHistoryRepository } from './repositories/status-history.repository';
import { ExceptionLogRepository } from './repositories/exception-log.repository';
import { ApprovalDecisionRepository } from './repositories/approval-decision.repository';
import { PickWorkLinkRepository } from './repositories/pick-work-link.repository';
import { PostingLinkRepository } from './repositories/posting-link.repository';
// Use Cases (Application Layer)
import { CreateShipmentUseCase } from './application/createShipment.usecase';
import { AllocateShipmentUseCase } from './application/allocateShipment.usecase';
import { ShipShipmentUseCase } from './application/shipShipment.usecase';
import { ReceiveOutboundWeightUseCase } from './application/receiveOutboundWeight.usecase';
// Infrastructure Adapters
import { M3AdapterService } from './infra/m3-adapter.service';

@Module({
  imports: [FoundationModule],
  controllers: [
    ShipmentController,
    AllocationController,
    WeighingController,
    ApprovalController,
    OutboundQueryController,
  ],
  providers: [
    // Services (Legacy)
    ShipmentService,
    ShipmentCommandService,
    ShipmentQueryService,
    ShipmentStateMachineService,
    ShipmentLineStateService,
    AllocationService,
    WeighingService,
    ToleranceService,
    ApprovalService,
    // Repositories
    ShipmentHeaderRepository,
    ShipmentLineRepository,
    AllocationRecordRepository,
    WeighingAttemptRepository,
    StatusHistoryRepository,
    ExceptionLogRepository,
    ApprovalDecisionRepository,
    PickWorkLinkRepository,
    PostingLinkRepository,
    // Use Cases (Application Layer) - CR-1/CR-2 fix
    CreateShipmentUseCase,
    AllocateShipmentUseCase,
    ShipShipmentUseCase,
    ReceiveOutboundWeightUseCase,
    // Infrastructure Adapters - M3 Integration
    M3AdapterService,
  ],
  exports: [
    ShipmentService,
    ShipmentQueryService,
    AllocationService,
    // Export use cases for cross-module usage
    CreateShipmentUseCase,
    AllocateShipmentUseCase,
    ShipShipmentUseCase,
  ],
})
export class OutboundModule {}
