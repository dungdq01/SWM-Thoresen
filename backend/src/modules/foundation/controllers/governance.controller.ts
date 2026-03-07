import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import {
  CreateBusinessRuleDto,
  CreateChangeControlDto,
  CreateDecisionLogDto,
  ListDecisionLogsQueryDto,
  ListRulesQueryDto,
  UpdateBusinessRuleDto,
} from '../dto';
import { GovernanceService } from '../services/governance.service';
import { IdempotencyService } from '../services/idempotency.service';

@Controller('foundation')
export class GovernanceController {
  constructor(
    private readonly governanceService: GovernanceService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Get('rules')
  @Permission('foundation.rules.view')
  listRules(@Query() query: ListRulesQueryDto) {
    return this.governanceService.listRules(query);
  }

  @Post('rules')
  @Permission('foundation.rules.create')
  createRule(
    @Body() body: CreateBusinessRuleDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_business_rule',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.governanceService.createRule({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'BUSINESS_RULE',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  @Put('rules/:id')
  @Permission('foundation.rules.update')
  updateRule(
    @Param('id') id: string,
    @Body() body: UpdateBusinessRuleDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'update_business_rule',
      sourceModule: 'FOUNDATION',
      payload: { id, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.governanceService.updateRule(id, {
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'BUSINESS_RULE',
        resourceId: id,
      }),
    });
  }

  @Get('decision-logs')
  @Permission('foundation.decision_logs.view')
  listDecisionLogs(@Query() query: ListDecisionLogsQueryDto) {
    return this.governanceService.listDecisionLogs(query);
  }

  @Post('decision-logs')
  @Permission('foundation.decision_logs.create')
  createDecisionLog(
    @Body() body: CreateDecisionLogDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_decision_log',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.governanceService.createDecisionLog({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'DECISION_LOG',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  @Post('change-controls')
  @Permission('foundation.change_controls.create')
  createChangeControl(
    @Body() body: CreateChangeControlDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_change_control',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.governanceService.createChangeControl({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'CHANGE_CONTROL',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
