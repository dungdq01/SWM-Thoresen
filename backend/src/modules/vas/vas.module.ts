import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { VasWorkOrderCommandController } from './controllers/vas-wo-command.controller';
import { VasWorkOrderQueryController } from './controllers/vas-wo-query.controller';
import { VasSessionController } from './controllers/vas-session.controller';

import { CreateVasWoService } from './services/create-vas-wo.service';
import { UpdateVasWoService } from './services/update-vas-wo.service';
import { ConfirmVasWoService } from './services/confirm-vas-wo.service';
import { AddVasSessionService } from './services/add-vas-session.service';
import { CompleteVasWoService } from './services/complete-vas-wo.service';
import { CancelVasWoService } from './services/cancel-vas-wo.service';
import { VasQueryService } from './services/vas-query.service';
import { VasStateMachineService } from './services/vas-state-machine.service';

import { VasWorkOrderRepository } from './repositories/vas-work-order.repository';
import { VasSessionRepository } from './repositories/vas-session.repository';
import { VasStateHistoryRepository } from './repositories/vas-state-history.repository';
import { VasExceptionLogRepository } from './repositories/vas-exception-log.repository';
import { VasOutboxRepository } from './repositories/vas-outbox.repository';

import { VasInventoryFacade } from './facades/vas-inventory.facade';
import { VasBillingFacade } from './facades/vas-billing.facade';
import { VasValidationService } from './services/vas-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    VasWorkOrderCommandController,
    VasWorkOrderQueryController,
    VasSessionController,
  ],
  providers: [
    // Services
    CreateVasWoService,
    UpdateVasWoService,
    ConfirmVasWoService,
    AddVasSessionService,
    CompleteVasWoService,
    CancelVasWoService,
    VasQueryService,
    VasStateMachineService,
    VasValidationService,
    // Repositories
    VasWorkOrderRepository,
    VasSessionRepository,
    VasStateHistoryRepository,
    VasExceptionLogRepository,
    VasOutboxRepository,
    // Facades
    VasInventoryFacade,
    VasBillingFacade,
  ],
  exports: [
    VasQueryService,
    VasInventoryFacade,
  ],
})
export class VasModule {}
