import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApprovalService } from '../services/approval.service';

class ApprovalDto {
  lineId?: string;
  decision: 'APPROVE' | 'REJECT' | 'REWEIGH';
  reasonCode: string;
  note?: string;
}

@ApiTags('Outbound - Approval')
@Controller('api/v1/outbound')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('approvals/pending')
  @ApiOperation({ summary: 'List pending approvals' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of shipments pending approval' })
  async getPendingApprovals(@Query('warehouseId') warehouseId?: string) {
    return this.approvalService.getPendingApprovals(warehouseId);
  }

  @Post('shipments/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve shipment or line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Approval processed' })
  @ApiResponse({ status: 400, description: 'Shipment not in pending approval status' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
  ) {
    return this.approvalService.processApproval({
      shipmentId: id,
      lineId: dto.lineId,
      decision: 'APPROVE',
      reasonCode: dto.reasonCode,
      note: dto.note,
      decidedBy: '00000000-0000-0000-0000-000000000000',
    });
  }

  @Post('shipments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject shipment or line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Rejection processed' })
  @ApiResponse({ status: 400, description: 'Shipment not in pending approval status' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
  ) {
    return this.approvalService.processApproval({
      shipmentId: id,
      lineId: dto.lineId,
      decision: 'REJECT',
      reasonCode: dto.reasonCode,
      note: dto.note,
      decidedBy: '00000000-0000-0000-0000-000000000000',
    });
  }
}
