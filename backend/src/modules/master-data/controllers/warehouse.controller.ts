import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from '../dto/warehouse.dto';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/warehouses')
@UseGuards(AuthGuard, PermissionGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.warehouse.create')
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: RequestUser) {
    return this.warehouseService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.warehouse.view')
  async findMany(@Query() dto: ListWarehouseDto) {
    return this.warehouseService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.warehouse.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouseService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.warehouse.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user: RequestUser) {
    return this.warehouseService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.warehouse.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.warehouseService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.warehouse.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.warehouseService.reactivate(id, dto, { userId: user.id });
  }
}
