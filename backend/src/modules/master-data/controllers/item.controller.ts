import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ItemService, CreateItemDto, UpdateItemDto, ListItemDto } from '../services/item.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/items')
@UseGuards(AuthGuard, PermissionGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('MASTER_DATA.ITEM.CREATE')
  async create(@Body() dto: CreateItemDto, @CurrentUser() user: RequestUser) {
    return this.itemService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('MASTER_DATA.ITEM.READ')
  async getNextCode() {
    const code = await this.itemService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('MASTER_DATA.ITEM.READ')
  async findMany(@Query() dto: ListItemDto) {
    return this.itemService.findMany(dto);
  }

  @Get(':id')
  @Permission('MASTER_DATA.ITEM.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.findById(id);
  }

  @Put(':id')
  @Permission('MASTER_DATA.ITEM.UPDATE')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto, @CurrentUser() user: RequestUser) {
    return this.itemService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.ITEM.DEACTIVATE')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.itemService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.ITEM.REACTIVATE')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.itemService.reactivate(id, dto, { userId: user.id });
  }
}
