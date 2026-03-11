import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateVasWoService } from '../services/create-vas-wo.service';
import { UpdateVasWoService } from '../services/update-vas-wo.service';
import { ConfirmVasWoService } from '../services/confirm-vas-wo.service';
import { CompleteVasWoService } from '../services/complete-vas-wo.service';
import { CancelVasWoService } from '../services/cancel-vas-wo.service';
import { CreateVasWoDto } from '../dto/create-vas-wo.dto';
import { UpdateVasWoDto } from '../dto/update-vas-wo.dto';
import { ConfirmVasWoDto } from '../dto/confirm-vas-wo.dto';
import { CompleteVasWoDto } from '../dto/complete-vas-wo.dto';
import { CancelVasWoDto } from '../dto/cancel-vas-wo.dto';
import {
  VasAuthGuard,
  VasPermissionGuard,
  Permission,
  CurrentUser,
  UserContext,
} from '../guards/vas-auth.guard';

@ApiTags('VAS Work Orders')
@ApiBearerAuth()
@Controller('vas-wo')
@UseGuards(VasAuthGuard, VasPermissionGuard)
export class VasWorkOrderCommandController {
  constructor(
    private readonly createService: CreateVasWoService,
    private readonly updateService: UpdateVasWoService,
    private readonly confirmService: ConfirmVasWoService,
    private readonly completeService: CompleteVasWoService,
    private readonly cancelService: CancelVasWoService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('VAS.WO.CREATE')
  @ApiOperation({ summary: 'Tạo VAS Work Order mới' })
  @ApiResponse({ status: 201, description: 'Work Order created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Duplicate externalId' })
  async create(@Body() dto: CreateVasWoDto, @CurrentUser() user: UserContext) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.createService.execute(dto, actor);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.UPDATE')
  @ApiOperation({ summary: 'Cập nhật VAS Work Order (chỉ DRAFT)' })
  @ApiResponse({ status: 200, description: 'Work Order updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state or optimistic lock failed' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVasWoDto,
    @CurrentUser() user: UserContext,
  ) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.updateService.execute(id, dto, actor);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.CONFIRM')
  @ApiOperation({ summary: 'Xác nhận WO và reserve stock' })
  @ApiResponse({ status: 200, description: 'Work Order confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state' })
  @ApiResponse({ status: 422, description: 'Insufficient stock' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmVasWoDto,
    @CurrentUser() user: UserContext,
  ) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.confirmService.execute(id, dto, actor);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.COMPLETE')
  @ApiOperation({ summary: 'Hoàn thành WO, post inventory và trigger billing' })
  @ApiResponse({ status: 200, description: 'Work Order completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state' })
  @ApiResponse({ status: 422, description: 'Invalid material balance' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteVasWoDto,
    @CurrentUser() user: UserContext,
  ) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.completeService.execute(id, dto, actor);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.CANCEL')
  @ApiOperation({ summary: 'Hủy WO và release reservation' })
  @ApiResponse({ status: 200, description: 'Work Order cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelVasWoDto,
    @CurrentUser() user: UserContext,
  ) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.cancelService.execute(id, dto, actor);
  }
}
