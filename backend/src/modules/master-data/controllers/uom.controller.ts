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
  @Permission('MASTER_DATA.UOM.CREATE')
  async create(@Body() dto: CreateUomDto, @CurrentUser() user: RequestUser) {
    return this.uomService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('MASTER_DATA.UOM.READ')
  async findMany(@Query() dto: ListUomDto) {
    return this.uomService.findMany(dto);
  }

  @Get(':id')
  @Permission('MASTER_DATA.UOM.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.uomService.findById(id);
  }

  @Put(':id')
  @Permission('MASTER_DATA.UOM.UPDATE')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUomDto, @CurrentUser() user: RequestUser) {
    return this.uomService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.UOM.DEACTIVATE')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.uomService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.UOM.REACTIVATE')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.uomService.reactivate(id, dto, { userId: user.id });
  }
}
