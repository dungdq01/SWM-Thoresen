import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { DropdownConfigService } from '../services/dropdown-config.service';
import { CreateDropdownConfigDto, UpdateDropdownConfigDto, ListDropdownConfigDto } from '../dto/dropdown-config.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';

@Controller('master-data/dropdown-configs')
@UseGuards(AuthGuard, PermissionGuard)
export class DropdownConfigController {
  constructor(private readonly dropdownConfigService: DropdownConfigService) {}

  // Static routes MUST come before :id to avoid ParseUUIDPipe conflict
  @Get('entities')
  @Permission('master_data.dropdown.view')
  getEntities() {
    return this.dropdownConfigService.getEntities();
  }

  @Get('fields')
  @Permission('master_data.dropdown.view')
  getFields(@Query('entity') entity: string) {
    return this.dropdownConfigService.getFields(entity);
  }

  @Get()
  @Permission('master_data.dropdown.view')
  async findMany(@Query() dto: ListDropdownConfigDto) {
    return this.dropdownConfigService.findMany(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.dropdown.create')
  async create(@Body() dto: CreateDropdownConfigDto) {
    return this.dropdownConfigService.create(dto);
  }

  @Get(':id')
  @Permission('master_data.dropdown.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.dropdown.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDropdownConfigDto) {
    return this.dropdownConfigService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('master_data.dropdown.delete')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.delete(id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.dropdown.update')
  async setDefault(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.setDefault(id);
  }
}
