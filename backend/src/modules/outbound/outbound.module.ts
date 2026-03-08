import { Module } from '@nestjs/common';
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

@Module({
  controllers: [
    ShipmentController,
    AllocationController,
    WeighingController,
    ApprovalController,
    OutboundQueryController,
  ],
  providers: [
    ShipmentService,
    ShipmentCommandService,
    ShipmentQueryService,
    ShipmentStateMachineService,
    ShipmentLineStateService,
    AllocationService,
    WeighingService,
    ToleranceService,
    ApprovalService,
    ShipmentHeaderRepository,
    ShipmentLineRepository,
    AllocationRecordRepository,
    WeighingAttemptRepository,
    StatusHistoryRepository,
    ExceptionLogRepository,
    ApprovalDecisionRepository,
    PickWorkLinkRepository,
    PostingLinkRepository,
  ],
  exports: [
    ShipmentService,
    ShipmentQueryService,
    AllocationService,
  ],
})
export class OutboundModule {}
