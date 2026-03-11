/**
 * Module 3: Inventory Core Engine - NestJS Module Wrapper
 * Bridges Express routes into NestJS application
 */

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../foundation/services/authorization.service';
import { FoundationModule } from '../foundation/foundation.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createInventoryCoreRoutes } = require('./index');

@Module({
  imports: [PrismaModule, FoundationModule],
})
export class InventoryCoreModule implements NestModule {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly configService: ConfigService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const expressRouter = createInventoryCoreRoutes(
      this.prisma,
      this.authorizationService,
      this.configService,
      { skipAuth: true }, // NestJS guards handle auth, skip Express auth middleware
    );

    consumer.apply(expressRouter).forRoutes('inventory');
  }
}
