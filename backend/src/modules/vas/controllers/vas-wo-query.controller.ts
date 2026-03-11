import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VasQueryService } from '../services/vas-query.service';
import { QueryVasWoDto } from '../dto/query-vas-wo.dto';
import { VasAuthGuard, VasPermissionGuard, Permission } from '../guards/vas-auth.guard';

@ApiTags('VAS Work Orders')
@ApiBearerAuth()
@Controller('vas-wo')
@UseGuards(VasAuthGuard, VasPermissionGuard)
export class VasWorkOrderQueryController {
  constructor(private readonly queryService: VasQueryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.READ')
  @ApiOperation({ summary: 'Lấy danh sách VAS Work Orders' })
  @ApiResponse({ status: 200, description: 'List of work orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Query() query: QueryVasWoDto) {
    return this.queryService.list(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.READ')
  @ApiOperation({ summary: 'Lấy chi tiết VAS Work Order' })
  @ApiResponse({ status: 200, description: 'Work Order detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getDetail(id);
  }

  @Get(':id/sessions')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.SESSION.READ')
  @ApiOperation({ summary: 'Lấy danh sách sessions của WO' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getSessions(id);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @Permission('VAS.WO.READ')
  @ApiOperation({ summary: 'Lấy lịch sử trạng thái của WO' })
  @ApiResponse({ status: 200, description: 'State history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getHistory(id);
  }
}
