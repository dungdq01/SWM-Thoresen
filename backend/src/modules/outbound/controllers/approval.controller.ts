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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApprovalService } from '../services/approval.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

class ApprovalDto {
  lineId?: string;
  decision!: 'APPROVE' | 'REJECT' | 'REWEIGH';
  reasonCode!: string;
  note?: string;
}

@ApiTags('Outbound - Approval')
@Controller('api/v1/outbound')
@UseGuards(AuthGuard, PermissionGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('approvals/pending')
  @ApiOperation({ summary: 'List pending approvals' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of shipments pending approval' })
  @Permission('OUTBOUND.APPROVAL.DECIDE')
  async getPendingApprovals(@Query('warehouseId') warehouseId?: string) {
    return this.approvalService.getPendingApprovals(warehouseId);
  }

  @Post('shipments/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve shipment or line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Approval processed' })
  @ApiResponse({ status: 400, description: 'Shipment not in pending approval status' })
  @Permission('OUTBOUND.APPROVAL.DECIDE')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    // CR-3: Now using proper RBAC - decidedBy from authenticated user
    const decidedBy = user.id;
    return this.approvalService.processApproval({
      shipmentId: id,
      lineId: dto.lineId,
      decision: 'APPROVE',
      reasonCode: dto.reasonCode,
      note: dto.note,
      decidedBy,
    });
  }

  @Post('shipments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject shipment or line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Rejection processed' })
  @ApiResponse({ status: 400, description: 'Shipment not in pending approval status' })
  @Permission('OUTBOUND.APPROVAL.DECIDE')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    // CR-3: Now using proper RBAC - decidedBy from authenticated user
    const decidedBy = user.id;
    return this.approvalService.processApproval({
      shipmentId: id,
      lineId: dto.lineId,
      decision: 'REJECT',
      reasonCode: dto.reasonCode,
      note: dto.note,
      decidedBy,
    });
  }
}
