import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ZoneService, CreateZoneDto, UpdateZoneDto, ListZoneDto } from '../services/zone.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/zones')
@UseGuards(AuthGuard, PermissionGuard)
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.zone.create')
  async create(@Body() dto: CreateZoneDto, @CurrentUser() user: RequestUser) {
    return this.zoneService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.zone.view')
  async findMany(@Query() dto: ListZoneDto) {
    return this.zoneService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.zone.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.zoneService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.zone.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto, @CurrentUser() user: RequestUser) {
    return this.zoneService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.zone.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.zoneService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.zone.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.zoneService.reactivate(id, dto, { userId: user.id });
  }
}
