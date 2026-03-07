import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ZoneService, CreateZoneDto, UpdateZoneDto, ListZoneDto } from '../services/zone.service';
import { DeactivateDto, ReactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateZoneDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.zoneService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListZoneDto) {
    return this.zoneService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.zoneService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.zoneService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.zoneService.deactivate(id, dto, ctx);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.zoneService.reactivate(id, dto, ctx);
  }
}
