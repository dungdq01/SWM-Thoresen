import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TransferOrderService } from '../services/transfer-order.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('inventory-control/transfers')
export class TransferOrderController {
  constructor(private readonly transferOrderService: TransferOrderService) {}

  @Get()
  @Permission('inventory.control.transfer.read')
  async list(@Query() query: any) {
    return this.transferOrderService.findMany(query);
  }

  @Get(':id')
  @Permission('inventory.control.transfer.read')
  async getById(@Param('id') id: string) {
    return this.transferOrderService.findOne(id);
  }

  @Post()
  @Permission('inventory.control.transfer.create')
  async create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.create(dto, user.id);
  }

  @Post(':id/release')
  @Permission('inventory.control.transfer.release')
  async release(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.release(id, user.id);
  }

  @Post(':id/ship')
  @Permission('inventory.control.transfer.ship')
  async ship(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.ship(id, user.id);
  }

  @Post(':id/receive')
  @Permission('inventory.control.transfer.receive')
  async receive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.receive(id, user.id);
  }

  @Post(':id/close')
  @Permission('inventory.control.transfer.close')
  async close(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.close(id, user.id);
  }

  @Post(':id/cancel')
  @Permission('inventory.control.transfer.cancel')
  async cancel(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.transferOrderService.cancel(id, dto, user.id);
  }
}
