import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SalesOrderService } from '../services/sales-order.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto, SalesOrderQueryDto } from '../dto/sales-order.dto';

@Controller('outbound/sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('next-number')
  async getNextNumber() {
    return this.salesOrderService.getNextSoNumber();
  }

  @Get()
  async findAll(@Query() query: SalesOrderQueryDto) {
    return this.salesOrderService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesOrderService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateSalesOrderDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.update(id, dto, userId);
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.confirm(id, userId);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.cancel(id, userId);
  }

  @Post(':id/close')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.close(id, userId);
  }

  @Post(':id/unconfirm')
  async unconfirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.salesOrderService.unconfirm(id, userId);
  }
}
