import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VasQueryService } from '../services/vas-query.service';
import { QueryVasWoDto } from '../dto/query-vas-wo.dto';

@ApiTags('VAS Work Orders')
@Controller('api/v1/vas-wo')
export class VasWorkOrderQueryController {
  constructor(private readonly queryService: VasQueryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách VAS Work Orders' })
  @ApiResponse({ status: 200, description: 'List of work orders' })
  async list(@Query() query: QueryVasWoDto) {
    return this.queryService.list(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết VAS Work Order' })
  @ApiResponse({ status: 200, description: 'Work Order detail' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getDetail(id);
  }

  @Get(':id/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách sessions của WO' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getSessions(id);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy lịch sử trạng thái của WO' })
  @ApiResponse({ status: 200, description: 'State history' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getHistory(id);
  }
}
