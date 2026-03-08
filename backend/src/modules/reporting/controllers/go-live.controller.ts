import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoLiveService } from '../services/go-live.service';
import { GoLiveStatusQueryDto, RunGoLiveCheckDto, SignOffGateDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Go-Live Control')
@Controller('api/v1/reporting/go-live')
@UseGuards(AuthGuard, PermissionGuard)
export class GoLiveController {
  constructor(private readonly goLiveService: GoLiveService) {}

  @Get('status')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.GOLIVE_READ)
  @ApiOperation({ summary: 'Lấy trạng thái go-live tổng quan' })
  @ApiResponse({ status: 200, description: 'Go-live status' })
  async getStatus(@Query() query: GoLiveStatusQueryDto) {
    return this.goLiveService.getStatus(query);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.GOLIVE_CHECK)
  @ApiOperation({ summary: 'Chạy auto check các gate' })
  @ApiResponse({ status: 200, description: 'Go-live checks completed' })
  async runChecks(@Body() dto: RunGoLiveCheckDto, @CurrentUser() user: RequestUser) {
    return this.goLiveService.runChecks(dto, user.id);
  }

  @Post('gates/:id/sign-off')
  @HttpCode(HttpStatus.OK)
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.GOLIVE_SIGNOFF)
  @ApiOperation({ summary: 'Manual sign-off một gate' })
  @ApiResponse({ status: 200, description: 'Gate signed off' })
  async signOff(
    @Param('id') gateId: string,
    @Body() dto: SignOffGateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.goLiveService.signOff(gateId, dto, user.id);
  }

  @Get('history')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.GOLIVE_READ)
  @ApiOperation({ summary: 'Lịch sử sign-off' })
  @ApiResponse({ status: 200, description: 'Sign-off history' })
  async getHistory(@Query('snapshotNo') snapshotNo?: string) {
    return this.goLiveService.getHistory(snapshotNo);
  }
}
