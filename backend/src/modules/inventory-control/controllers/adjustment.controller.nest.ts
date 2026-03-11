import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AdjustmentService } from '../services/adjustment.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('inventory-control/adjustments')
export class AdjustmentController {
  constructor(private readonly adjustmentService: AdjustmentService) {}

  @Get()
  @Permission('inventory.control.adjustment.read')
  async list(@Query() query: any) {
    return this.adjustmentService.findMany(query);
  }

  @Get(':id')
  @Permission('inventory.control.adjustment.read')
  async getById(@Param('id') id: string) {
    return this.adjustmentService.findOne(id);
  }

  @Post()
  @Permission('inventory.control.adjustment.create')
  async create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.adjustmentService.create(dto, user.id);
  }

  @Post(':id/submit')
  @Permission('inventory.control.adjustment.submit')
  async submit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.adjustmentService.submit(id, user.id);
  }
}
