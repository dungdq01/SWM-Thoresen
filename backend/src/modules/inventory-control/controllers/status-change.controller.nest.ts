import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { StatusChangeService } from '../services/status-change.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('inventory-control/status-changes')
export class StatusChangeController {
  constructor(private readonly statusChangeService: StatusChangeService) {}

  @Get()
  @Permission('inventory.control.status.read')
  async list(@Query() query: any) {
    return this.statusChangeService.findMany(query);
  }

  @Get(':id')
  @Permission('inventory.control.status.read')
  async getById(@Param('id') id: string) {
    return this.statusChangeService.findOne(id);
  }

  @Post()
  @Permission('inventory.control.status.create')
  async create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.statusChangeService.create(dto, user.id);
  }

  @Post(':id/execute')
  @Permission('inventory.control.status.execute')
  async execute(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.statusChangeService.execute(id, user.id);
  }

  @Post(':id/cancel')
  @Permission('inventory.control.status.cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.statusChangeService.cancel(id, user.id);
  }
}
