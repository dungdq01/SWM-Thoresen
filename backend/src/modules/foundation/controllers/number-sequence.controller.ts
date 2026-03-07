import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import {
  CreateNumberSequenceDto,
  GetNextNumberDto,
  UpdateNumberSequenceDto,
} from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { NumberSequenceService } from '../services/number-sequence.service';

@Controller('foundation')
export class NumberSequenceController {
  constructor(
    private readonly numberSequenceService: NumberSequenceService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Get('number-sequences')
  @Permission('foundation.number_sequences.view')
  listSequences() {
    return this.numberSequenceService.list();
  }

  @Post('number-sequences')
  @Permission('foundation.number_sequences.create')
  createSequence(
    @Body() body: CreateNumberSequenceDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_number_sequence',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.numberSequenceService.create({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'NUMBER_SEQUENCE',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  @Put('number-sequences/:id')
  @Permission('foundation.number_sequences.update')
  updateSequence(
    @Param('id') id: string,
    @Body() body: UpdateNumberSequenceDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'update_number_sequence',
      sourceModule: 'FOUNDATION',
      payload: { id, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.numberSequenceService.update(id, {
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'NUMBER_SEQUENCE',
        resourceId: id,
      }),
    });
  }

  @Post('number-sequences/:code/next')
  @Permission('foundation.number_sequences.next')
  getNextNumber(
    @Param('code') code: string,
    @Body() body: GetNextNumberDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'get_next_number',
      sourceModule: 'FOUNDATION',
      payload: { code, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.numberSequenceService.getNextNumber(code, body.scopeKey, {
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'NUMBER_SEQUENCE',
        resourceId: code,
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
