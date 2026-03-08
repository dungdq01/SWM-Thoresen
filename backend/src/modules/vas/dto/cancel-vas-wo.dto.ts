import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelVasWoDto {
  @ApiProperty({ description: 'Reason code cho cancel' })
  @IsString()
  @MaxLength(50)
  reasonCode!: string;

  @ApiPropertyOptional({ description: 'Ghi chú bổ sung' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiProperty({ description: 'External ID cho idempotency' })
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
