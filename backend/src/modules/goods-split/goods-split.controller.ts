import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { GoodsSplitService, CreateGoodsSplitDto, ConfirmSplitDto } from './goods-split.service';

@Controller('goods-split')
@UseGuards(AuthGuard, PermissionGuard)
export class GoodsSplitController {
  constructor(private readonly splitService: GoodsSplitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('INVENTORY.GOODS_SPLIT.CREATE')
  async create(@Body() dto: CreateGoodsSplitDto, @CurrentUser() user: RequestUser) {
    return this.splitService.create(dto, user.id);
  }

  @Get()
  @Permission('INVENTORY.GOODS_SPLIT.READ')
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.splitService.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      warehouseId,
      ownerId,
    });
  }

  @Get(':id')
  @Permission('INVENTORY.GOODS_SPLIT.READ')
  async findById(@Param('id') id: string) {
    return this.splitService.findById(id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('INVENTORY.GOODS_SPLIT.CONFIRM')
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmSplitDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.splitService.confirm(id, dto, user.id);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @Permission('INVENTORY.GOODS_SPLIT.POST')
  async post(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.splitService.post(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Permission('INVENTORY.GOODS_SPLIT.CANCEL')
  async cancel(
    @Param('id') id: string,
    @Body('reasonCode') reasonCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.splitService.cancel(id, reasonCode, user.id);
  }
}
