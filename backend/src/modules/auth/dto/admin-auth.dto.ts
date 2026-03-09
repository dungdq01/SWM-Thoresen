import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ForceResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu tạm thời không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(128)
  temporaryPassword!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class UnlockAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class RevokeAllSessionsDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
