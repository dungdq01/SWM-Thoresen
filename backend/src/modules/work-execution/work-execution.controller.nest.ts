import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WorkExecutionService } from './work-execution.service.nest';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@Controller('works')
export class WorkExecutionController {
  constructor(private readonly workExecutionService: WorkExecutionService) {}

  @Get()
  @Permission('work.execution.read')
  async list(@Query() query: any) {
    return this.workExecutionService.findMany(query);
  }

  @Get('dashboard/summary')
  @Permission('work.dashboard.read')
  async getDashboardSummary(@Query('warehouseId') warehouseId?: string) {
    return this.workExecutionService.getDashboardSummary(warehouseId);
  }

  @Get('my')
  @Permission('work.execution.read')
  async getMyWorks(@Query() query: any, @CurrentUser() user: RequestUser) {
    return this.workExecutionService.getMyWorks(user.id, query);
  }

  @Get('monitor')
  @Permission('work.dashboard.read')
  async getMonitorData(@Query() query: any) {
    return this.workExecutionService.getMonitorData(query);
  }

  @Get(':id')
  @Permission('work.execution.read')
  async getById(@Param('id') id: string) {
    return this.workExecutionService.findOne(id);
  }

  @Get(':id/history')
  @Permission('work.execution.read')
  async getWorkHistory(@Param('id') id: string) {
    return this.workExecutionService.getWorkHistory(id);
  }

  @Get(':id/exceptions')
  @Permission('work.execution.read')
  async getWorkExceptions(@Param('id') id: string) {
    return this.workExecutionService.getWorkExceptions(id);
  }

  @Post(':id/claim')
  @Permission('work.execution.claim')
  async claimWork(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workExecutionService.claimWork(id, user.id);
  }

  @Post(':id/release')
  @Permission('work.execution.claim')
  async releaseWork(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workExecutionService.releaseWork(id, user.id);
  }

  @Post(':id/start')
  @Permission('work.execution.start')
  async startWork(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workExecutionService.startWork(id, user.id);
  }

  @Post(':id/cancel')
  @Permission('work.execution.cancel')
  async cancelWork(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.workExecutionService.cancelWork(id, user.id, dto?.reasonCode);
  }

  @Post(':id/lines/:lineNum/complete')
  @Permission('work.execution.complete')
  async completeLine(
    @Param('id') id: string,
    @Param('lineNum') lineNum: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workExecutionService.completeLine(id, Number(lineNum), user.id, dto);
  }

  @Post(':id/lines/:lineNum/skip')
  @Permission('work.execution.skip')
  async skipLine(
    @Param('id') id: string,
    @Param('lineNum') lineNum: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workExecutionService.skipLine(id, Number(lineNum), user.id, dto);
  }
}
