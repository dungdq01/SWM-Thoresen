import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { OwnerService } from '../services/owner.service';
import { CreateOwnerDto, UpdateOwnerDto, ListOwnerDto } from '../dto/owner.dto';
import { DeactivateDto, ReactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/owners')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOwnerDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.ownerService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListOwnerDto) {
    return this.ownerService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ownerService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.ownerService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.ownerService.deactivate(id, dto, ctx);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.ownerService.reactivate(id, dto, ctx);
  }
}
