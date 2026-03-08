import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmVasWoDto {
  @ApiProperty({ description: 'External ID cho idempotency' })
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
