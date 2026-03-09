import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UserAuthRepository } from '../repositories/user-auth.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordHistoryRepository } from '../repositories/password-history.repository';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { CredentialRepository } from '../repositories/credential.repository';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';
import { LockoutService } from './lockout.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginResult, RefreshResult } from '../interfaces/security-context.interface';
import { AuthChannel, AuthSecurityEventType, AuthSecurityEventSeverity } from '@prisma/client';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHistoryRepository: PasswordHistoryRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly credentialRepository: CredentialRepository,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly lockoutService: LockoutService,
  ) {}

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<LoginResult> {
    const user = await this.userAuthRepository.findByUsernameWithCredential(dto.username);

    if (!user) {
      await this.securityEventRepository.create({
        eventType: AuthSecurityEventType.LOGIN_FAIL,
        severity: AuthSecurityEventSeverity.WARN,
        channel: dto.channel as AuthChannel,
        ipAddress,
        userAgent,
        correlationId,
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        eventPayload: { username: dto.username },
      });
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Thông tin đăng nhập không chính xác',
      });
    }

    if (!user.isActive) {
      await this.securityEventRepository.create({
        eventType: AuthSecurityEventType.LOGIN_FAIL,
        severity: AuthSecurityEventSeverity.WARN,
        userId: user.id,
        channel: dto.channel as AuthChannel,
        ipAddress,
        userAgent,
        correlationId,
        errorCode: 'AUTH_ACCOUNT_INACTIVE',
      });
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'Tài khoản đã bị vô hiệu hóa',
      });
    }

    if (this.lockoutService.isAccountLocked(user.lockedUntil)) {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_LOCKED',
        message: 'Tài khoản đang bị khóa. Vui lòng thử lại sau.',
        lockedUntil: user.lockedUntil,
      });
    }

    if (!user.credential) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Thông tin đăng nhập không chính xác',
      });
    }

    const passwordValid = await this.passwordPolicyService.verifyPassword(
      dto.password,
      user.credential.passwordHash,
    );

    if (!passwordValid) {
      const lockResult = await this.lockoutService.recordFailedAttempt(
        user.id,
        user.username,
        dto.channel as AuthChannel,
        ipAddress,
        userAgent,
        'INVALID_PASSWORD',
        correlationId,
      );

      if (lockResult.locked) {
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_LOCKED',
          message: 'Quá nhiều lần đăng nhập sai. Tài khoản đã bị khóa tạm thời.',
          lockedUntil: lockResult.lockedUntil,
        });
      }

      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Thông tin đăng nhập không chính xác',
      });
    }

    await this.lockoutService.recordSuccessfulLogin(
      user.id,
      user.username,
      dto.channel as AuthChannel,
      ipAddress,
      userAgent,
      correlationId,
    );

    const userWithRoles = await this.userAuthRepository.findByIdWithRolesAndWarehouses(user.id);
    const roleCodes = userWithRoles?.userRoles.map((ur) => ur.role.roleCode) ?? [];
    const warehouseCodes = userWithRoles?.userRoles
      .filter((ur) => ur.warehouseCode)
      .map((ur) => ur.warehouseCode!) ?? [];

    const warehouseOptions = await this.getWarehouseOptions(warehouseCodes);
    const selectedWarehouseId = warehouseOptions.length === 1 
      ? warehouseOptions[0].id 
      : user.defaultWarehouseId ?? null;

    const sessionResult = await this.sessionService.createSession(
      {
        userId: user.id,
        channel: dto.channel as AuthChannel,
        authVersion: user.authVersion,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        userAgent,
        ipAddress,
        selectedWarehouseId: selectedWarehouseId ?? undefined,
      },
      user.userCode,
      user.username,
    );

    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.LOGIN_SUCCESS,
      severity: AuthSecurityEventSeverity.INFO,
      userId: user.id,
      sessionId: sessionResult.sessionId,
      channel: dto.channel as AuthChannel,
      ipAddress,
      userAgent,
      correlationId,
    });

    return {
      accessToken: sessionResult.accessToken,
      refreshToken: sessionResult.refreshToken,
      tokenType: 'Bearer',
      expiresIn: sessionResult.expiresIn,
      sessionId: sessionResult.sessionId,
      user: {
        id: user.id,
        userCode: user.userCode,
        username: user.username,
        fullName: user.fullName,
        roleCodes,
        mustChangePassword: user.credential.mustChangePassword,
      },
      warehouseOptions,
      selectedWarehouseId,
    };
  }

  async refresh(
    dto: RefreshDto,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<RefreshResult> {
    const tokenHash = this.tokenService.hashToken(dto.refreshToken);
    const refreshToken = await this.refreshTokenRepository.findByTokenHashWithSession(tokenHash);

    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Refresh token không hợp lệ',
      });
    }

    if (refreshToken.isRevoked) {
      await this.refreshTokenRepository.revokeByTokenFamily(
        refreshToken.tokenFamily,
        'REPLAY_DETECTED',
      );
      await this.sessionService.revokeSession(
        refreshToken.sessionId,
        null,
        'REFRESH_REPLAY_DETECTED',
      );

      await this.securityEventRepository.create({
        eventType: AuthSecurityEventType.REFRESH_REPLAY_DETECTED,
        severity: AuthSecurityEventSeverity.HIGH,
        userId: refreshToken.session.userId,
        sessionId: refreshToken.sessionId,
        ipAddress,
        userAgent,
        correlationId,
      });

      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_REPLAY_DETECTED',
        message: 'Phát hiện sử dụng lại refresh token. Vui lòng đăng nhập lại.',
      });
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_EXPIRED',
        message: 'Refresh token đã hết hạn',
      });
    }

    const session = refreshToken.session;
    if (!session.isCurrent || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_REVOKED',
        message: 'Session đã hết hiệu lực',
      });
    }

    const user = await this.userAuthRepository.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'Tài khoản không còn hoạt động',
      });
    }

    if (session.authVersionAtIssue !== user.authVersion) {
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_REVOKED',
        message: 'Session đã bị vô hiệu do thay đổi bảo mật',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await this.refreshTokenRepository.revoke(refreshToken.id, 'ROTATED', tx);

      const { rawToken: newRawToken, tokenHash: newTokenHash } =
        this.tokenService.generateRotatedRefreshToken(refreshToken.tokenFamily);

      await this.refreshTokenRepository.create(
        {
          sessionId: session.id,
          tokenHash: newTokenHash,
          tokenFamily: refreshToken.tokenFamily,
          expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
          rotatedFromId: refreshToken.id,
        },
        tx,
      );

      await this.sessionService.updateLastSeen(session.id);

      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        userCode: user.userCode,
        username: user.username,
        sessionId: session.id,
        channel: session.channel as 'WEB' | 'MOBILE' | 'API',
        authVersion: Number(user.authVersion),
        selectedWarehouseId: session.selectedWarehouseId,
      });

      await this.securityEventRepository.create(
        {
          eventType: AuthSecurityEventType.TOKEN_REFRESH,
          severity: AuthSecurityEventSeverity.INFO,
          userId: user.id,
          sessionId: session.id,
          ipAddress,
          userAgent,
          correlationId,
        },
        tx,
      );

      return {
        accessToken,
        refreshToken: newRawToken,
        expiresIn: this.tokenService.getAccessTokenExpiresIn(),
        sessionId: session.id,
      };
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    correlationId?: string,
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'AUTH_PASSWORD_MISMATCH',
        message: 'Mật khẩu xác nhận không khớp',
      });
    }

    const user = await this.userAuthRepository.findByUsernameWithCredential(
      (await this.userAuthRepository.findById(userId))?.username ?? '',
    );

    if (!user?.credential) {
      throw new BadRequestException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'Không tìm thấy thông tin người dùng',
      });
    }

    const oldPasswordValid = await this.passwordPolicyService.verifyPassword(
      dto.oldPassword,
      user.credential.passwordHash,
    );

    if (!oldPasswordValid) {
      throw new BadRequestException({
        code: 'AUTH_OLD_PASSWORD_INVALID',
        message: 'Mật khẩu cũ không chính xác',
      });
    }

    const newHash = await this.passwordPolicyService.validateAndHash(
      dto.newPassword,
      user.username,
      userId,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.credentialRepository.updatePassword(userId, newHash, false, tx);

      await this.passwordHistoryRepository.create(
        {
          userId,
          passwordHash: newHash,
          changedBy: userId,
          changeReason: 'USER_CHANGE',
        },
        tx,
      );

      await this.userAuthRepository.incrementAuthVersion(userId, tx);

      await this.securityEventRepository.create(
        {
          eventType: AuthSecurityEventType.PASSWORD_CHANGED,
          severity: AuthSecurityEventSeverity.INFO,
          userId,
          correlationId,
        },
        tx,
      );
    });

    await this.sessionService.revokeAllSessions(
      userId,
      userId,
      'PASSWORD_CHANGED',
      undefined,
      correlationId,
    );
  }

  private async getWarehouseOptions(
    warehouseCodes: string[],
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    if (warehouseCodes.length === 0) {
      const allWarehouses = await this.prisma.mdWarehouse.findMany({
        where: { isActive: true },
        select: { id: true, warehouseCode: true, warehouseName: true },
      });
      return allWarehouses.map((w) => ({
        id: w.id,
        code: w.warehouseCode,
        name: w.warehouseName,
      }));
    }

    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: {
        warehouseCode: { in: warehouseCodes },
        isActive: true,
      },
      select: { id: true, warehouseCode: true, warehouseName: true },
    });

    return warehouses.map((w) => ({
      id: w.id,
      code: w.warehouseCode,
      name: w.warehouseName,
    }));
  }
}
