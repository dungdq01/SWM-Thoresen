import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CarrierService } from '../services/carrier.service';
import { CreateCarrierDto, UpdateCarrierDto, ListCarrierDto } from '../dto/carrier.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/carriers')
@UseGuards(AuthGuard, PermissionGuard)
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.carrier.create')
  async create(@Body() dto: CreateCarrierDto, @CurrentUser() user: RequestUser) {
    return this.carrierService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.carrier.view')
  async getNextCode() {
    const code = await this.carrierService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.carrier.view')
  async findMany(@Query() dto: ListCarrierDto) {
    return this.carrierService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.carrier.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.carrierService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.carrier.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCarrierDto, @CurrentUser() user: RequestUser) {
    return this.carrierService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.carrier.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.carrierService.deactivate(id, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.carrier.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.carrierService.reactivate(id, { userId: user.id });
  }
}
