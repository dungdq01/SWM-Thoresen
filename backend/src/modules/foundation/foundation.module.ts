import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { GovernanceController } from './controllers/governance.controller';
import { LogController } from './controllers/log.controller';
import { NumberSequenceController } from './controllers/number-sequence.controller';
import { NumberSequenceRepository } from './repositories/number-sequence.repository';
import { PermissionController } from './controllers/permission.controller';
import { ReasonCodeController } from './controllers/reason-code.controller';
import { RoleController } from './controllers/role.controller';
import { GovernanceRepository } from './repositories/governance.repository';
import { LogRepository } from './repositories/log.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { ReasonCodeRepository } from './repositories/reason-code.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthorizationService } from './services/authorization.service';
import { GovernanceService } from './services/governance.service';
import { IdempotencyService } from './services/idempotency.service';
import { LogService } from './services/log.service';
import { NumberSequenceService } from './services/number-sequence.service';
import { PermissionService } from './services/permission.service';
import { ReasonCodeService } from './services/reason-code.service';
import { RoleService } from './services/role.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RoleController,
    PermissionController,
    ReasonCodeController,
    NumberSequenceController,
    GovernanceController,
    LogController,
  ],
  providers: [
    RoleRepository,
    PermissionRepository,
    ReasonCodeRepository,
    NumberSequenceRepository,
    GovernanceRepository,
    LogRepository,
    UserRepository,
    AuthorizationService,
    RoleService,
    PermissionService,
    ReasonCodeService,
    NumberSequenceService,
    GovernanceService,
    LogService,
    IdempotencyService,
  ],
  exports: [AuthorizationService, IdempotencyService, LogService],
})
export class FoundationModule {}
