import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { FoundationModule } from '../foundation/foundation.module';

import {
  AuthController,
  ProfileController,
  SessionController,
  PasswordController,
  AdminAuthController,
} from './controllers';

import {
  TokenService,
  PasswordPolicyService,
  LockoutService,
  SessionService,
  AuthenticationService,
  SecurityAuditService,
} from './services';

import {
  CredentialRepository,
  SessionRepository,
  RefreshTokenRepository,
  LoginAttemptRepository,
  PasswordHistoryRepository,
  SecurityEventRepository,
  UserAuthRepository,
} from './repositories';

@Module({
  imports: [PrismaModule, ConfigModule, FoundationModule],
  controllers: [
    AuthController,
    ProfileController,
    SessionController,
    PasswordController,
    AdminAuthController,
  ],
  providers: [
    CredentialRepository,
    SessionRepository,
    RefreshTokenRepository,
    LoginAttemptRepository,
    PasswordHistoryRepository,
    SecurityEventRepository,
    UserAuthRepository,
    TokenService,
    PasswordPolicyService,
    LockoutService,
    SessionService,
    AuthenticationService,
    SecurityAuditService,
  ],
  exports: [
    TokenService,
    SessionService,
    AuthenticationService,
    SecurityAuditService,
    UserAuthRepository,
  ],
})
export class AuthModule {}
