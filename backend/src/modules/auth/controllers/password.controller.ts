import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticationService } from '../services/authentication.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';

@Controller('auth')
@UseGuards(AuthGuard)
export class PasswordController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const user = (req as any).user;
    const correlationId = (req as any).requestId;

    await this.authenticationService.changePassword(user.userId, dto, correlationId);

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }
}
