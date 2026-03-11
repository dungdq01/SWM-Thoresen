import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { FoundationModule } from './modules/foundation/foundation.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { BillingModule } from './modules/billing/billing.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { IntegrationPlatformModule } from './modules/integration-platform/integration-platform.module';
import { VasModule } from './modules/vas/vas.module';
import { InventoryCoreModule } from './modules/inventory-core/inventory-core.module';
import { InventoryControlModule } from './modules/inventory-control/inventory-control.module';
import { WorkExecutionModule } from './modules/work-execution/work-execution.module.nest';
import { IntegrationMonitoringModule } from './modules/integration/integration-monitoring.module.nest';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    FoundationModule,
    MasterDataModule,
    AuthModule,
    InboundModule,
    OutboundModule,
    BillingModule,
    ReportingModule,
    IntegrationPlatformModule,
    VasModule,
    InventoryCoreModule,
    InventoryControlModule,
    WorkExecutionModule,
    IntegrationMonitoringModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
