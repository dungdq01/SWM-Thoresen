import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DebitNoteService } from '../services/debit-note.service';
import {
  GenerateDebitNoteDto,
  ReviewDebitNoteDto,
  ApproveDebitNoteDto,
  LockDebitNoteDto,
  QueryDebitNoteDto,
} from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';

@Controller('billing/debit-notes')
@UseGuards(AuthGuard, PermissionGuard)
export class DebitNoteController {
  constructor(private readonly dnService: DebitNoteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('BILLING.DN.GENERATE')
  async generate(@Body() dto: GenerateDebitNoteDto, @CurrentUser('id') userId: string) {
    const result = await this.dnService.generate(dto, userId);
    return {
      success: true,
      data: result.data,
      meta: { isReplay: result.isReplay },
    };
  }

  @Get()
  @Permission('BILLING.DN.READ')
  async findMany(@Query() query: QueryDebitNoteDto) {
    const result = await this.dnService.findMany(query);
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Get(':id')
  @Permission('BILLING.DN.READ')
  async findById(@Param('id') id: string) {
    const dn = await this.dnService.findById(id);
    return {
      success: true,
      data: dn,
    };
  }

  @Put(':id/review')
  @Permission('BILLING.DN.REVIEW')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewDebitNoteDto,
    @CurrentUser('id') userId: string,
  ) {
    const dn = await this.dnService.review(id, dto, userId);
    return {
      success: true,
      data: dn,
    };
  }

  @Put(':id/approve')
  @Permission('BILLING.DN.APPROVE')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveDebitNoteDto,
    @CurrentUser('id') userId: string,
  ) {
    const dn = await this.dnService.approve(id, dto, userId);
    return {
      success: true,
      data: dn,
    };
  }

  @Put(':id/lock')
  @Permission('BILLING.DN.LOCK')
  async lock(
    @Param('id') id: string,
    @Body() dto: LockDebitNoteDto,
    @CurrentUser('id') userId: string,
  ) {
    const dn = await this.dnService.lock(id, dto, userId);
    return {
      success: true,
      data: dn,
    };
  }

  @Get(':id/history')
  @Permission('BILLING.DN.READ')
  async getHistory(@Param('id') id: string) {
    const history = await this.dnService.getHistory(id);
    return {
      success: true,
      data: history,
    };
  }
}
