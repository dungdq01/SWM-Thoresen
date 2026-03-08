import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AllocationService } from '../services/allocation.service';
import { ShipmentQueryService } from '../services/shipment-query.service';

@ApiTags('Outbound - Allocation')
@Controller('api/v1/outbound/shipments')
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly queryService: ShipmentQueryService,
  ) {}

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate inventory for shipment lines' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Allocation result' })
  @ApiResponse({ status: 400, description: 'Cannot allocate - invalid status or insufficient stock' })
  async allocate(@Param('id', ParseUUIDPipe) id: string) {
    return this.allocationService.allocateShipment(id);
  }

  @Post(':id/unallocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release allocation for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Allocation released' })
  @ApiResponse({ status: 400, description: 'Cannot unallocate' })
  async unallocate(@Param('id', ParseUUIDPipe) id: string) {
    return this.allocationService.releaseAll(id);
  }

  @Get(':id/allocations')
  @ApiOperation({ summary: 'View allocation records for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'List of allocation records' })
  async getAllocations(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getAllocations(id);
  }
}
