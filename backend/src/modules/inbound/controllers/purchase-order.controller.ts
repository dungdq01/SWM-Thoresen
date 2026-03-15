import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CancelPurchaseOrderDto,
  PurchaseOrderQueryDto,
} from '../dto/purchase-order.dto';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@ApiTags('Inbound - Purchase Orders')
@Controller('inbound/purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Get('next-number')
  @ApiOperation({ summary: 'Get next PO number' })
  @ApiResponse({ status: 200, description: 'Next PO number' })
  @Permission('inbound.po.view')
  async getNextNumber() {
    return this.poService.getNextPoNumber();
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of purchase orders' })
  @Permission('inbound.po.view')
  async list(@Query() query: PurchaseOrderQueryDto) {
    return this.poService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @Permission('inbound.po.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.poService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Permission('inbound.po.create')
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user?: RequestUser) {
    return this.poService.create(dto, user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update purchase order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Permission('inbound.po.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.poService.update(id, dto, user?.id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm purchase order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order confirmed' })
  @Permission('inbound.po.confirm')
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.poService.confirm(id, user?.id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close purchase order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order closed' })
  @Permission('inbound.po.close')
  async close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.poService.close(id, user?.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  @Permission('inbound.po.cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.poService.cancel(id, dto, user?.id);
  }

  @Post(':id/unconfirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unconfirm purchase order (revert to NEW status)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Purchase order unconfirmed' })
  @ApiResponse({ status: 400, description: 'Cannot unconfirm PO with receipts' })
  @Permission('inbound.po.confirm')
  async unconfirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.poService.unconfirm(id, user?.id);
  }
}
