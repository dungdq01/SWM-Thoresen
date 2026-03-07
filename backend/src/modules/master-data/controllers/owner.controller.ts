import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { OwnerService } from '../services/owner.service';
import { CreateOwnerDto, UpdateOwnerDto, ListOwnerDto } from '../dto/owner.dto';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/owners')
@UseGuards(AuthGuard, PermissionGuard)
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('MASTER_DATA.OWNER.CREATE')
  async create(@Body() dto: CreateOwnerDto, @CurrentUser() user: RequestUser) {
    return this.ownerService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('MASTER_DATA.OWNER.READ')
  async findMany(@Query() dto: ListOwnerDto) {
    return this.ownerService.findMany(dto);
  }

  @Get(':id')
  @Permission('MASTER_DATA.OWNER.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ownerService.findById(id);
  }

  @Put(':id')
  @Permission('MASTER_DATA.OWNER.UPDATE')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerDto, @CurrentUser() user: RequestUser) {
    return this.ownerService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.OWNER.DEACTIVATE')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.ownerService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.OWNER.REACTIVATE')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.ownerService.reactivate(id, dto, { userId: user.id });
  }
}
