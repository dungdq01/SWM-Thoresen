import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { LocationService, CreateLocationDto, UpdateLocationDto, ListLocationDto } from '../services/location.service';
import { DeactivateDto, ReactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLocationDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.locationService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListLocationDto) {
    return this.locationService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.locationService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.locationService.deactivate(id, dto, ctx);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.locationService.reactivate(id, dto, ctx);
  }
}
