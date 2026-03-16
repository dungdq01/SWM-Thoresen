import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ItemGroupService } from '../services/item-group.service';
import { CreateItemGroupDto, UpdateItemGroupDto, ListItemGroupDto } from '../dto/item-group.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/item-groups')
@UseGuards(AuthGuard, PermissionGuard)
export class ItemGroupController {
  constructor(private readonly itemGroupService: ItemGroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.item.create')
  async create(@Body() dto: CreateItemGroupDto, @CurrentUser() user: RequestUser) {
    return this.itemGroupService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.owner.view')
  async getNextCode() {
    const code = await this.itemGroupService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.item.view')
  async findMany(@Query() dto: ListItemGroupDto) {
    return this.itemGroupService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.item.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemGroupService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.item.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemGroupDto, @CurrentUser() user: RequestUser) {
    return this.itemGroupService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.item.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.itemGroupService.deactivate(id, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.item.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.itemGroupService.reactivate(id, { userId: user.id });
  }
}
