import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ItemIncompatibilityService } from '../services/item-incompatibility.service';
import {
  CreateItemIncompatibilityDto,
  UpdateItemIncompatibilityDto,
  ListItemIncompatibilityDto,
  CheckIncompatibilityDto,
} from '../dto/item-incompatibility.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/item-incompatibilities')
@UseGuards(AuthGuard, PermissionGuard)
export class ItemIncompatibilityController {
  constructor(private readonly incompatibilityService: ItemIncompatibilityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.item_incompatibility.create')
  async create(@Body() dto: CreateItemIncompatibilityDto, @CurrentUser() user: RequestUser) {
    return this.incompatibilityService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.item_incompatibility.view')
  async findMany(@Query() dto: ListItemIncompatibilityDto) {
    return this.incompatibilityService.findMany(dto);
  }

  @Get('check')
  @Permission('master_data.item_incompatibility.view')
  async checkIncompatibility(@Query() dto: CheckIncompatibilityDto) {
    return this.incompatibilityService.checkIncompatibility(dto.itemId1, dto.itemId2);
  }

  @Get(':id')
  @Permission('master_data.item_incompatibility.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.incompatibilityService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.item_incompatibility.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemIncompatibilityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.incompatibilityService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.item_incompatibility.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.incompatibilityService.deactivate(id, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.item_incompatibility.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.incompatibilityService.reactivate(id, { userId: user.id });
  }
}
