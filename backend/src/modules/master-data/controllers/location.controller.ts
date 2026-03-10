import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { LocationService, CreateLocationDto, UpdateLocationDto, ListLocationDto } from '../services/location.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/locations')
@UseGuards(AuthGuard, PermissionGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.location.create')
  async create(@Body() dto: CreateLocationDto, @CurrentUser() user: RequestUser) {
    return this.locationService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.location.view')
  async findMany(@Query() dto: ListLocationDto) {
    return this.locationService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.location.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.location.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto, @CurrentUser() user: RequestUser) {
    return this.locationService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.location.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.locationService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.location.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.locationService.reactivate(id, dto, { userId: user.id });
  }
}
