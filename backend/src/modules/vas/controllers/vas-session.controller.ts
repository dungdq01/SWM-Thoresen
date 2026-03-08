import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AddVasSessionService } from '../services/add-vas-session.service';
import { AddVasSessionDto } from '../dto/add-vas-session.dto';

@ApiTags('VAS Sessions')
@Controller('api/v1/vas-wo')
export class VasSessionController {
  constructor(private readonly addSessionService: AddVasSessionService) {}

  @Post(':id/session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm session progress vào WO' })
  @ApiResponse({ status: 201, description: 'Session added' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state or duplicate externalId' })
  async addSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddVasSessionDto,
  ) {
    const actor = { userId: '00000000-0000-0000-0000-000000000001', role: 'SYSTEM' };
    return this.addSessionService.execute(id, dto, actor);
  }
}
