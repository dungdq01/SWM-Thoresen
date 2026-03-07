import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { UomService, CreateUomDto, UpdateUomDto, ListUomDto } from '../services/uom.service';
import { DeactivateDto, RequestContext } from '../dto/common.dto';

@Controller('master-data/uoms')
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUomDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.uomService.create(dto, ctx);
  }

  @Get()
  async findMany(@Query() dto: ListUomDto) {
    return this.uomService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.uomService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUomDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.uomService.update(id, dto, ctx);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.uomService.deactivate(id, dto, ctx);
  }
}
