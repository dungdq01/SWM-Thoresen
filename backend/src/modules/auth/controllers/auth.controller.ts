import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticationService } from '../services/authentication.service';
import { SessionService } from '../services/session.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { LoginResult, RefreshResult } from '../interfaces/security-context.interface';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResult> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const correlationId = (req as any).requestId;

    return this.authenticationService.login(dto, ipAddress, userAgent, correlationId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<RefreshResult> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const correlationId = (req as any).requestId;

    return this.authenticationService.refresh(dto, ipAddress, userAgent, correlationId);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request): Promise<void> {
    const user = (req as any).user;
    if (!user?.sessionId) return;

    const ipAddress = req.ip || req.socket.remoteAddress;
    const correlationId = (req as any).requestId;

    await this.sessionService.revokeSession(
      user.sessionId,
      user.userId,
      'LOGOUT',
      user.channel,
      ipAddress,
      correlationId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Req() req: Request): Promise<void> {
    const user = (req as any).user;
    if (!user?.userId) return;

    const correlationId = (req as any).requestId;

    await this.sessionService.revokeAllSessions(
      user.userId,
      user.userId,
      'LOGOUT_ALL',
      undefined,
      correlationId,
    );
  }
}
