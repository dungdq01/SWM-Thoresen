import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';

export enum AuthChannelDto {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  API = 'API',
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  @MaxLength(80)
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password không được để trống' })
  password!: string;

  @IsEnum(AuthChannelDto, { message: 'Channel phải là WEB, MOBILE hoặc API' })
  channel!: AuthChannelDto;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  deviceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  deviceName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;
}
