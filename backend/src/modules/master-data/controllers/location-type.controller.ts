import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { LocationTypeService } from '../services/location-type.service';
import { CreateLocationTypeDto, UpdateLocationTypeDto, ListLocationTypeDto } from '../dto/location-type.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/location-types')
@UseGuards(AuthGuard, PermissionGuard)
export class LocationTypeController {
  constructor(private readonly locationTypeService: LocationTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.location.create')
  async create(@Body() dto: CreateLocationTypeDto, @CurrentUser() user: RequestUser) {
    return this.locationTypeService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.owner.view')
  async getNextCode() {
    const code = await this.locationTypeService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.location.view')
  async findMany(@Query() dto: ListLocationTypeDto) {
    return this.locationTypeService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.location.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationTypeService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.location.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationTypeDto, @CurrentUser() user: RequestUser) {
    return this.locationTypeService.update(id, dto, { userId: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.location.deactivate')
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.locationTypeService.delete(id, { userId: user.id });
  }
}
