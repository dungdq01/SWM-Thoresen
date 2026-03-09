import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PasswordHistoryRepository } from '../repositories/password-history.repository';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class PasswordPolicyService {
  private readonly minLength: number;
  private readonly historyCount: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly passwordHistoryRepository: PasswordHistoryRepository,
  ) {
    this.minLength = this.configService.get<number>('PASSWORD_MIN_LENGTH') || 8;
    this.historyCount = this.configService.get<number>('PASSWORD_HISTORY_COUNT') || 5;
  }

  validatePasswordPolicy(password: string, username: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < this.minLength) {
      errors.push(`Mật khẩu phải có ít nhất ${this.minLength} ký tự`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất 1 chữ thường');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất 1 chữ hoa');
    }

    if (!/\d/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất 1 số');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (@$!%*?&)');
    }

    if (password.toLowerCase().includes(username.toLowerCase())) {
      errors.push('Mật khẩu không được chứa username');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async checkPasswordHistory(
    userId: string,
    newPasswordHash: string,
    newPassword: string,
  ): Promise<boolean> {
    const history = await this.passwordHistoryRepository.findRecentByUserId(
      userId,
      this.historyCount,
    );

    for (const record of history) {
      const isMatch = await argon2.verify(record.passwordHash, newPassword);
      if (isMatch) {
        return false;
      }
    }

    return true;
  }

  async validateAndHash(
    password: string,
    username: string,
    userId?: string,
  ): Promise<string> {
    const validation = this.validatePasswordPolicy(password, username);
    if (!validation.valid) {
      throw new BadRequestException({
        code: 'AUTH_PASSWORD_POLICY_VIOLATION',
        message: 'Mật khẩu không đạt yêu cầu',
        errors: validation.errors,
      });
    }

    const hash = await this.hashPassword(password);

    if (userId) {
      const historyOk = await this.checkPasswordHistory(userId, hash, password);
      if (!historyOk) {
        throw new BadRequestException({
          code: 'AUTH_PASSWORD_REUSE_NOT_ALLOWED',
          message: `Không được sử dụng ${this.historyCount} mật khẩu gần nhất`,
        });
      }
    }

    return hash;
  }
}
