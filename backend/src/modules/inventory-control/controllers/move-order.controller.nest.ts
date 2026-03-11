import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MoveOrderService } from '../services/move-order.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('inventory-control/moves')
export class MoveOrderController {
  constructor(private readonly moveOrderService: MoveOrderService) {}

  @Get()
  @Permission('inventory.control.move.read')
  async list(@Query() query: any) {
    return this.moveOrderService.findMany(query);
  }

  @Get(':id')
  @Permission('inventory.control.move.read')
  async getById(@Param('id') id: string) {
    return this.moveOrderService.findOne(id);
  }

  @Post()
  @Permission('inventory.control.move.create')
  async create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.moveOrderService.create(dto, user.id);
  }

  @Post(':id/confirm')
  @Permission('inventory.control.move.confirm')
  async confirm(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.moveOrderService.confirm(id, user.id);
  }

  @Post(':id/execute')
  @Permission('inventory.control.move.execute')
  async execute(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.moveOrderService.execute(id, user.id);
  }

  @Post(':id/cancel')
  @Permission('inventory.control.move.cancel')
  async cancel(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.moveOrderService.cancel(id, dto, user.id);
  }
}
