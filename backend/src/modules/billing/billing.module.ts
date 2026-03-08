import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { FoundationModule } from '../foundation/foundation.module';

import {
  BillingContractController,
  BillingDayTypeController,
  BillingEventController,
  BillingEventInternalController,
  DebitNoteController,
  BillingExceptionController,
} from './controllers';

import {
  BillingContractService,
  BillingDayTypeService,
  BillingEventService,
  RateResolutionService,
  ChargeCalculationService,
  DebitNoteService,
  BillingExceptionService,
} from './services';

import {
  BillingContractRepository,
  BillingDayTypeRepository,
  BillingEventRepository,
  DebitNoteRepository,
  BillingExceptionRepository,
} from './repositories';

@Module({
  imports: [PrismaModule, FoundationModule],
  controllers: [
    BillingContractController,
    BillingDayTypeController,
    BillingEventController,
    BillingEventInternalController,
    DebitNoteController,
    BillingExceptionController,
  ],
  providers: [
    BillingContractRepository,
    BillingDayTypeRepository,
    BillingEventRepository,
    DebitNoteRepository,
    BillingExceptionRepository,
    BillingContractService,
    BillingDayTypeService,
    BillingEventService,
    RateResolutionService,
    ChargeCalculationService,
    DebitNoteService,
    BillingExceptionService,
  ],
  exports: [
    BillingContractService,
    BillingDayTypeService,
    BillingEventService,
    DebitNoteService,
    BillingExceptionService,
  ],
})
export class BillingModule {}
