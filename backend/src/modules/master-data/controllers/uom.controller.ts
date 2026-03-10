import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { UomService, CreateUomDto, UpdateUomDto, ListUomDto } from '../services/uom.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/uoms')
@UseGuards(AuthGuard, PermissionGuard)
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.uom.create')
  async create(@Body() dto: CreateUomDto, @CurrentUser() user: RequestUser) {
    return this.uomService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.uom.view')
  async findMany(@Query() dto: ListUomDto) {
    return this.uomService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.uom.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.uomService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.uom.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUomDto, @CurrentUser() user: RequestUser) {
    return this.uomService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.uom.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.uomService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.uom.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.uomService.reactivate(id, dto, { userId: user.id });
  }
}
