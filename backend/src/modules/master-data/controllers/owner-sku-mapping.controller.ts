import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { OwnerSkuMappingService } from '../services/owner-sku-mapping.service';
import { CreateOwnerSkuMappingDto, UpdateOwnerSkuMappingDto, ListOwnerSkuMappingDto } from '../dto/owner-sku-mapping.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/owner-sku-mappings')
@UseGuards(AuthGuard, PermissionGuard)
export class OwnerSkuMappingController {
  constructor(private readonly ownerSkuMappingService: OwnerSkuMappingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.owner.create')
  async create(@Body() dto: CreateOwnerSkuMappingDto, @CurrentUser() user: RequestUser) {
    return this.ownerSkuMappingService.create(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.owner.view')
  async getNextCode() {
    const code = await this.ownerSkuMappingService.getNextCode();
    return { data: { code } };
  }

  @Get()
  @Permission('master_data.owner.view')
  async findMany(@Query() dto: ListOwnerSkuMappingDto) {
    return this.ownerSkuMappingService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.owner.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ownerSkuMappingService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.owner.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerSkuMappingDto, @CurrentUser() user: RequestUser) {
    return this.ownerSkuMappingService.update(id, dto, { userId: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.owner.deactivate')
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.ownerSkuMappingService.delete(id, { userId: user.id });
  }
}
