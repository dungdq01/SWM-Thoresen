import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SessionService } from '../services/session.service';
import { LockoutService } from '../services/lockout.service';
import { PasswordPolicyService } from '../services/password-policy.service';
import { CredentialRepository } from '../repositories/credential.repository';
import { PasswordHistoryRepository } from '../repositories/password-history.repository';
import { UserAuthRepository } from '../repositories/user-auth.repository';
import { SecurityAuditService } from '../services/security-audit.service';
import {
  ForceResetPasswordDto,
  UnlockAccountDto,
  RevokeAllSessionsDto,
} from '../dto/admin-auth.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@Controller('admin/auth/users')
@UseGuards(AuthGuard)
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly lockoutService: LockoutService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly credentialRepository: CredentialRepository,
    private readonly passwordHistoryRepository: PasswordHistoryRepository,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Post(':id/force-reset-password')
  @RequirePermission('ADMIN.USER.RESET_PASSWORD')
  @HttpCode(HttpStatus.OK)
  async forceResetPassword(
    @Param('id') userId: string,
    @Body() dto: ForceResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const adminUser = (req as any).user;
    const correlationId = (req as any).requestId;

    const targetUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User không tồn tại',
      });
    }

    const passwordHash = await this.passwordPolicyService.hashPassword(
      dto.temporaryPassword,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.credentialRepository.updatePassword(
        userId,
        passwordHash,
        true,
        tx,
      );

      await this.passwordHistoryRepository.create(
        {
          userId,
          passwordHash,
          changedBy: adminUser.userId,
          changeReason: 'ADMIN_RESET',
        },
        tx,
      );

      await this.userAuthRepository.incrementAuthVersion(userId, tx);
    });

    await this.sessionService.revokeAllSessions(
      userId,
      adminUser.userId,
      'ADMIN_PASSWORD_RESET',
      undefined,
      correlationId,
    );

    await this.securityAuditService.logAdminPasswordReset(
      userId,
      adminUser.userId,
      dto.reason,
      correlationId,
    );

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  @Post(':id/unlock')
  @RequirePermission('ADMIN.USER.UNLOCK')
  @HttpCode(HttpStatus.OK)
  async unlockAccount(
    @Param('id') userId: string,
    @Body() dto: UnlockAccountDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const adminUser = (req as any).user;
    const correlationId = (req as any).requestId;

    const targetUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, lockedUntil: true },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User không tồn tại',
      });
    }

    await this.lockoutService.unlockAccount(
      userId,
      adminUser.userId,
      dto.reason,
      correlationId,
    );

    return { message: 'Mở khóa tài khoản thành công' };
  }

  @Post(':id/revoke-all-sessions')
  @RequirePermission('ADMIN.USER.REVOKE_SESSIONS')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Param('id') userId: string,
    @Body() dto: RevokeAllSessionsDto,
    @Req() req: Request,
  ): Promise<{ message: string; revokedCount: number }> {
    const adminUser = (req as any).user;
    const correlationId = (req as any).requestId;

    const targetUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User không tồn tại',
      });
    }

    const revokedCount = await this.sessionService.revokeAllSessions(
      userId,
      adminUser.userId,
      dto.reason || 'ADMIN_REVOKE',
      undefined,
      correlationId,
    );

    return {
      message: 'Thu hồi tất cả session thành công',
      revokedCount,
    };
  }
}
