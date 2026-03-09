import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../services/session.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { SessionInfo } from '../interfaces/security-context.interface';

@Controller('auth')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('sessions')
  async getSessions(@Req() req: Request): Promise<SessionInfo[]> {
    const user = (req as any).user;
    return this.sessionService.getActiveSessions(user.userId, user.sessionId);
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param('id') sessionId: string,
    @Req() req: Request,
  ): Promise<void> {
    const user = (req as any).user;
    const correlationId = (req as any).requestId;

    const sessions = await this.sessionService.getActiveSessions(user.userId);
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      throw new NotFoundException({
        code: 'AUTH_SESSION_NOT_FOUND',
        message: 'Session không tồn tại hoặc đã hết hiệu lực',
      });
    }

    await this.sessionService.revokeSession(
      sessionId,
      user.userId,
      'USER_REVOKED',
      user.channel,
      req.ip,
      correlationId,
    );
  }
}
