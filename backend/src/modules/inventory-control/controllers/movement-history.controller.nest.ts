import { Controller, Get, Query } from '@nestjs/common';
import { MovementHistoryService } from '../services/movement-history.service.nest';
import { Permission } from '../../../common/decorators/permission.decorator';

@Controller('inventory-control/movement-history')
export class MovementHistoryController {
  constructor(private readonly movementHistoryService: MovementHistoryService) {}

  @Get()
  @Permission('inventory.control.movement.read')
  async list(@Query() query: any) {
    return this.movementHistoryService.findMany(query);
  }
}
