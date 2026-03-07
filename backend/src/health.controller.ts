import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  getHealth() {
    return {
      status: 'ok',
      service: 'swms-backend',
    };
  }
}
