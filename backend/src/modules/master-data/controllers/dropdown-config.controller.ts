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
  @Permission('MASTER_DATA.DROPDOWN.READ')
  getEntities() {
    return this.dropdownConfigService.getEntities();
  }

  @Get('fields')
  @Permission('MASTER_DATA.DROPDOWN.READ')
  getFields(@Query('entity') entity: string) {
    return this.dropdownConfigService.getFields(entity);
  }

  @Get()
  @Permission('MASTER_DATA.DROPDOWN.READ')
  async findMany(@Query() dto: ListDropdownConfigDto) {
    return this.dropdownConfigService.findMany(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('MASTER_DATA.DROPDOWN.CREATE')
  async create(@Body() dto: CreateDropdownConfigDto) {
    return this.dropdownConfigService.create(dto);
  }

  @Get(':id')
  @Permission('MASTER_DATA.DROPDOWN.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.findById(id);
  }

  @Put(':id')
  @Permission('MASTER_DATA.DROPDOWN.UPDATE')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDropdownConfigDto) {
    return this.dropdownConfigService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('MASTER_DATA.DROPDOWN.DELETE')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.delete(id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @Permission('MASTER_DATA.DROPDOWN.UPDATE')
  async setDefault(@Param('id', ParseUUIDPipe) id: string) {
    return this.dropdownConfigService.setDefault(id);
  }
}
