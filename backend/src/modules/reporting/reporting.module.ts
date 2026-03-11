import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { FoundationModule } from '../foundation/foundation.module';

import { 
  DashboardController, 
  InventoryReportController, 
  ReconciliationController,
  GoLiveController,
  ExportController,
} from './controllers';

import { 
  DashboardService, 
  InventoryReportService, 
  ReconciliationService,
  GoLiveService,
  ExportService,
} from './services';

import { 
  DashboardRepository, 
  InventoryReportRepository, 
  ReconciliationRepository,
  GoLiveRepository,
  ExportJobRepository,
} from './repositories';

@Module({
  imports: [PrismaModule, FoundationModule],
  controllers: [
    DashboardController,
    InventoryReportController,
    ReconciliationController,
    GoLiveController,
    ExportController,
  ],
  providers: [
    DashboardService,
    InventoryReportService,
    ReconciliationService,
    GoLiveService,
    ExportService,
    DashboardRepository,
    InventoryReportRepository,
    ReconciliationRepository,
    GoLiveRepository,
    ExportJobRepository,
  ],
  exports: [
    DashboardService,
    InventoryReportService,
    ReconciliationService,
    GoLiveService,
    ExportService,
  ],
})
export class ReportingModule {}
