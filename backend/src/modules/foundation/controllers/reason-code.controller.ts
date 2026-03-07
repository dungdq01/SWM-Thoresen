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
  CreateReasonCodeDto,
  ListReasonCodesQueryDto,
  UpdateReasonCodeDto,
} from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { ReasonCodeService } from '../services/reason-code.service';

@Controller('foundation')
export class ReasonCodeController {
  constructor(
    private readonly reasonCodeService: ReasonCodeService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Get('reason-codes')
  @Permission('foundation.reason_codes.view')
  listReasonCodes(@Query() query: ListReasonCodesQueryDto) {
    return this.reasonCodeService.list(query);
  }

  @Post('reason-codes')
  @Permission('foundation.reason_codes.create')
  createReasonCode(
    @Body() body: CreateReasonCodeDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_reason_code',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.reasonCodeService.create({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'REASON_CODE',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  @Put('reason-codes/:id')
  @Permission('foundation.reason_codes.update')
  updateReasonCode(
    @Param('id') id: string,
    @Body() body: UpdateReasonCodeDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'update_reason_code',
      sourceModule: 'FOUNDATION',
      payload: { id, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.reasonCodeService.update(id, {
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'REASON_CODE',
        resourceId: id,
      }),
    });
  }

  @Post('reason-codes/:id/deactivate')
  @Permission('foundation.reason_codes.deactivate')
  deactivateReasonCode(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'deactivate_reason_code',
      sourceModule: 'FOUNDATION',
      payload: { id },
      correlationId: request.requestId,
      execute: () =>
        this.reasonCodeService.deactivate(id, {
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'REASON_CODE',
        resourceId: id,
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
