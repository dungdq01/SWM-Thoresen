import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { RackService } from '../services/rack.service';
import { CreateRackDto, UpdateRackDto, ListRackDto } from '../dto/rack.dto';
import { DeactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/racks')
@UseGuards(AuthGuard, PermissionGuard)
export class RackController {
  constructor(private readonly rackService: RackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.rack.create')
  async create(@Body() dto: CreateRackDto, @CurrentUser() user: RequestUser) {
    return this.rackService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.rack.view')
  async findMany(@Query() dto: ListRackDto) {
    return this.rackService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.rack.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rackService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.rack.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRackDto, @CurrentUser() user: RequestUser) {
    return this.rackService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.rack.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.rackService.deactivate(id, dto, { userId: user.id });
  }
}
