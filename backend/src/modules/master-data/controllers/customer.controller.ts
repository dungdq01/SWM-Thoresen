import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto, UpdateCustomerDto, ListCustomerDto } from '../dto/customer.dto';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/customers')
@UseGuards(AuthGuard, PermissionGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('next-code')
  @Permission('master_data.customer.view')
  async getNextCode() {
    const code = await this.customerService.getNextCode();
    return { data: { code } };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.customer.create')
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: RequestUser) {
    return this.customerService.create(dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.customer.view')
  async findMany(@Query() dto: ListCustomerDto) {
    return this.customerService.findMany(dto);
  }

  @Get(':id')
  @Permission('master_data.customer.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.findById(id);
  }

  @Put(':id')
  @Permission('master_data.customer.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: RequestUser) {
    return this.customerService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.customer.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.customerService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.customer.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.customerService.reactivate(id, dto, { userId: user.id });
  }
}
