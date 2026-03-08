import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { TokenPayload } from '../interfaces/security-context.interface';

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTokenTtlMinutes: number;
  private readonly refreshTokenTtlDays: number;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'dev-secret-change-me';
    this.accessTokenTtlMinutes = this.configService.get<number>('ACCESS_TOKEN_TTL_MINUTES') || 15;
    this.refreshTokenTtlDays = this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS') || 7;
  }

  generateAccessToken(payload: {
    userId: string;
    userCode: string;
    username: string;
    sessionId: string;
    channel: 'WEB' | 'MOBILE' | 'API';
    authVersion: number;
    selectedWarehouseId: string | null;
  }): string {
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: payload.userId,
      sid: payload.sessionId,
      usr: payload.username,
      ucd: payload.userCode,
      ch: payload.channel,
      av: payload.authVersion,
      wh: payload.selectedWarehouseId,
    };

    return sign(tokenPayload, this.jwtSecret, {
      expiresIn: `${this.accessTokenTtlMinutes}m`,
    });
  }

  generateRefreshToken(): { rawToken: string; tokenHash: string; tokenFamily: string } {
    const rawToken = randomBytes(32).toString('hex');
    const tokenFamily = randomBytes(16).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash, tokenFamily };
  }

  generateRotatedRefreshToken(tokenFamily: string): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = verify(token, this.jwtSecret) as JwtPayload & TokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  getAccessTokenExpiresIn(): number {
    return this.accessTokenTtlMinutes * 60;
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  }

  getSessionExpiresAt(channel: 'WEB' | 'MOBILE' | 'API'): Date {
    const days = channel === 'MOBILE' ? 14 : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  generateSessionCode(): string {
    return `SES-${Date.now().toString(36).toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}`;
  }
}
