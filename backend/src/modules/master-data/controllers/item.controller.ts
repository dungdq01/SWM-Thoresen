import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ItemService, CreateItemDto, UpdateItemDto, ListItemDto } from '../services/item.service';
import { DeactivateDto, ReactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.itemService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListItemDto) {
    return this.itemService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.itemService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.itemService.deactivate(id, dto, ctx);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.itemService.reactivate(id, dto, ctx);
  }
}
