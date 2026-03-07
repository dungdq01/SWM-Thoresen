import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { ListAuditLogsQueryDto, ListExceptionLogsQueryDto } from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { LogService } from '../services/log.service';

@Controller('foundation')
export class LogController {
  constructor(
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Get('audit-logs')
  @Permission('foundation.audit_logs.view')
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.logService.listAuditLogs(query);
  }

  @Get('exception-logs')
  @Permission('foundation.exception_logs.view')
  listExceptionLogs(@Query() query: ListExceptionLogsQueryDto) {
    return this.logService.listExceptionLogs(query);
  }

  @Post('exception-logs/:id/resolve')
  @Permission('foundation.exception_logs.resolve')
  resolveException(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.logService.resolveException(id, user.id);
  }

  @Get('idempotency/:key')
  @Permission('foundation.idempotency.view')
  getIdempotency(@Param('key') key: string) {
    return this.idempotencyService.getByKey(key);
  }
}
