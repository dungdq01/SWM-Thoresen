import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { VehicleTypeService, CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto } from '../services/vehicle-type.service';
import { DeactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/vehicle-types')
export class VehicleTypeController {
  constructor(private readonly vehicleTypeService: VehicleTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVehicleTypeDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.vehicleTypeService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListVehicleTypeDto) {
    return this.vehicleTypeService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleTypeService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleTypeDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.vehicleTypeService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.vehicleTypeService.deactivate(id, dto, ctx);
  }
}
