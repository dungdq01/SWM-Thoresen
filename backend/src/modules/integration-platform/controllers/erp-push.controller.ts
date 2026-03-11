import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { ErpPushService, EnqueuePushJobParams } from '../services/erp-push.service';

class EnqueuePushJobDto {
  @IsString()
  pushType!: string;

  @IsString()
  referenceId!: string;

  payload!: Record<string, unknown>;

  @IsUUID()
  correlationId!: string;

  @IsOptional()
  @IsString()
  endpointName?: string;
}

class RetryJobDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class CancelJobDto {
  @IsString()
  reason!: string;
}

@Controller('integration/erp-push')
@UseGuards(AuthGuard, PermissionGuard)
export class ErpPushController {
  constructor(private readonly pushService: ErpPushService) {}

  @Post('jobs')
  @Permission('INTEGRATION.ERP_PUSH.ENQUEUE')
  async enqueueJob(@Body() dto: EnqueuePushJobDto) {
    return this.pushService.enqueuePushJob(dto);
  }

  @Get('jobs')
  @Permission('INTEGRATION.ERP_PUSH.READ')
  async getJobs(
    @Query('pushType') pushType?: string,
    @Query('status') status?: string,
    @Query('referenceId') referenceId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pushService.getJobs({
      pushType,
      status,
      referenceId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('jobs/:id')
  @Permission('INTEGRATION.ERP_PUSH.READ')
  async getJobById(@Param('id') id: string) {
    return this.pushService.getJobById(id);
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.ERP_PUSH.RETRY')
  async retryJob(@Param('id') id: string, @Body() dto: RetryJobDto, @CurrentUser() user: RequestUser) {
    return this.pushService.retryJob(id, user.id);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.ERP_PUSH.CANCEL')
  async cancelJob(@Param('id') id: string, @Body() dto: CancelJobDto, @CurrentUser() user: RequestUser) {
    return this.pushService.cancelJob(id, user.id, dto.reason);
  }
}
