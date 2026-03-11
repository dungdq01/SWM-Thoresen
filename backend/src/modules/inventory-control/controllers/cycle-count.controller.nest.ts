import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CycleCountService } from '../services/cycle-count.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('inventory-control/cycle-counts')
export class CycleCountController {
  constructor(private readonly cycleCountService: CycleCountService) {}

  @Get()
  @Permission('inventory.control.cycle_count.read')
  async list(@Query() query: any) {
    return this.cycleCountService.findMany(query);
  }

  @Get(':id')
  @Permission('inventory.control.cycle_count.read')
  async getById(@Param('id') id: string) {
    return this.cycleCountService.findOne(id);
  }

  @Post()
  @Permission('inventory.control.cycle_count.create')
  async create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.cycleCountService.create(dto, user.id);
  }

  @Post(':id/release')
  @Permission('inventory.control.cycle_count.release')
  async release(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.cycleCountService.release(id, user.id);
  }
}
