import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmVasWoDto {
  @ApiPropertyOptional({ description: 'External ID cho idempotency (tự động sinh nếu không truyền)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;
}
