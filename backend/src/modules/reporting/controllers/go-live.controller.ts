import { Controller, Get, Post, Param, Query, Body, Request } from '@nestjs/common';
import { GoLiveService } from '../services/go-live.service';
import { GoLiveStatusQueryDto, RunGoLiveCheckDto, SignOffGateDto } from '../dto';

@Controller('api/v1/reporting/go-live')
export class GoLiveController {
  constructor(private readonly goLiveService: GoLiveService) {}

  @Get('status')
  async getStatus(@Query() query: GoLiveStatusQueryDto) {
    return this.goLiveService.getStatus(query);
  }

  @Post('check')
  async runChecks(@Body() dto: RunGoLiveCheckDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.goLiveService.runChecks(dto, userId);
  }

  @Post('gates/:id/sign-off')
  async signOff(
    @Param('id') gateId: string,
    @Body() dto: SignOffGateDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.goLiveService.signOff(gateId, dto, userId);
  }

  @Get('history')
  async getHistory(@Query('snapshotNo') snapshotNo?: string) {
    return this.goLiveService.getHistory(snapshotNo);
  }
}
