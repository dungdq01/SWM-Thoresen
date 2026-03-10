import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { VehicleTypeService, CreateVehicleTypeDto, UpdateVehicleTypeDto, ListVehicleTypeDto } from '../services/vehicle-type.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/vehicle-types')
@UseGuards(AuthGuard, PermissionGuard)
export class VehicleTypeController {
  constructor(private readonly vehicleTypeService: VehicleTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.vehicle_type.create')
  async create(@Body() dto: CreateVehicleTypeDto, @CurrentUser() user: RequestUser) {
    return this.vehicleTypeService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.vehicle_type.view')
  async findMany(@Query() dto: ListVehicleTypeDto) {
    return this.vehicleTypeService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.vehicle_type.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleTypeService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.vehicle_type.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleTypeDto, @CurrentUser() user: RequestUser) {
    return this.vehicleTypeService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vehicle_type.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.vehicleTypeService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vehicle_type.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.vehicleTypeService.reactivate(id, dto, { userId: user.id });
  }
}
