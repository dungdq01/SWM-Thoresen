import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddVasSessionService } from '../services/add-vas-session.service';
import { AddVasSessionDto } from '../dto/add-vas-session.dto';
import {
  VasAuthGuard,
  VasPermissionGuard,
  Permission,
  CurrentUser,
  UserContext,
} from '../guards/vas-auth.guard';

@ApiTags('VAS Sessions')
@ApiBearerAuth()
@Controller('vas-wo')
@UseGuards(VasAuthGuard, VasPermissionGuard)
export class VasSessionController {
  constructor(private readonly addSessionService: AddVasSessionService) {}

  @Post(':id/session')
  @HttpCode(HttpStatus.CREATED)
  @Permission('VAS.SESSION.CREATE')
  @ApiOperation({ summary: 'Thêm session progress vào WO' })
  @ApiResponse({ status: 201, description: 'Session added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Work Order not found' })
  @ApiResponse({ status: 409, description: 'Invalid state or duplicate externalId' })
  @ApiResponse({ status: 422, description: 'Insufficient packaging stock' })
  async addSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddVasSessionDto,
    @CurrentUser() user: UserContext,
  ) {
    const actor = { userId: user.id, role: user.roleCodes[0] || 'USER' };
    return this.addSessionService.execute(id, dto, actor);
  }
}
