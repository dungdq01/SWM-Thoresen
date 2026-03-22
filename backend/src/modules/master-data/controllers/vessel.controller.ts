import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { VesselService } from '../services/vessel.service';
import { CreateVesselDto, UpdateVesselDto, ListVesselDto } from '../dto/vessel.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/vessels')
@UseGuards(AuthGuard, PermissionGuard)
export class VesselController {
  constructor(private readonly vesselService: VesselService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.vessel.create')
  async create(@Body() dto: CreateVesselDto, @CurrentUser() user: RequestUser) {
    return this.vesselService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.vessel.view')
  async getNextCode() {
    const code = await this.vesselService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.vessel.view')
  async findMany(@Query() dto: ListVesselDto) {
    return this.vesselService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.vessel.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vesselService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.vessel.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVesselDto, @CurrentUser() user: RequestUser) {
    return this.vesselService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vessel.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.vesselService.deactivate(id, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vessel.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.vesselService.reactivate(id, { userId: user.id });
  }
}
