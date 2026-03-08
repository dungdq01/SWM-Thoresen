import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AllocationService } from '../services/allocation.service';
import { ShipmentQueryService } from '../services/shipment-query.service';
import { AllocateShipmentUseCase } from '../application/allocateShipment.usecase';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@ApiTags('Outbound - Allocation')
@Controller('api/v1/outbound/shipments')
@UseGuards(AuthGuard, PermissionGuard)
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly queryService: ShipmentQueryService,
    private readonly allocateUseCase: AllocateShipmentUseCase,
  ) {}

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate inventory for shipment lines' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Allocation result' })
  @ApiResponse({ status: 400, description: 'Cannot allocate - invalid status or insufficient stock' })
  @Permission('OUTBOUND.ALLOCATION.EXECUTE')
  async allocate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    // FIX: Wire to use case instead of old service for CR-1/CR-2 real M3 integration
    return this.allocateUseCase.execute({
      shipmentId: id,
      userId: user.id,
    });
  }

  @Post(':id/unallocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release allocation for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Allocation released' })
  @ApiResponse({ status: 400, description: 'Cannot unallocate' })
  @Permission('OUTBOUND.ALLOCATION.EXECUTE')
  async unallocate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.allocationService.releaseAll(id, user.id);
  }

  @Get(':id/allocations')
  @ApiOperation({ summary: 'View allocation records for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'List of allocation records' })
  @Permission('OUTBOUND.SHIPMENT.READ')
  async getAllocations(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getAllocations(id);
  }
}
