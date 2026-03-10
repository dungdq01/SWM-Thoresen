import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { VendorService, CreateVendorDto, UpdateVendorDto, ListVendorDto } from '../services/vendor.service';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/vendors')
@UseGuards(AuthGuard, PermissionGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.vendor.create')
  async create(@Body() dto: CreateVendorDto, @CurrentUser() user: RequestUser) {
    return this.vendorService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.vendor.view')
  async getNextCode() {
    const code = await this.vendorService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.vendor.view')
  async findMany(@Query() dto: ListVendorDto) {
    return this.vendorService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.vendor.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.vendor.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVendorDto, @CurrentUser() user: RequestUser) {
    return this.vendorService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vendor.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.vendorService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.vendor.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.vendorService.reactivate(id, dto, { userId: user.id });
  }
}
