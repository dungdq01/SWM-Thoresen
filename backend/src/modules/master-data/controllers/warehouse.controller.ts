import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto, ListWarehouseDto } from '../dto/warehouse.dto';
import { DeactivateDto, ReactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWarehouseDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.warehouseService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListWarehouseDto) {
    return this.warehouseService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouseService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.warehouseService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.warehouseService.deactivate(id, dto, ctx);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.warehouseService.reactivate(id, dto, ctx);
  }
}
