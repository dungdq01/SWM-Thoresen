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
import { BillingContractService } from '../services/billing-contract.service';
import { CreateContractDto, UpdateContractDto, QueryContractDto, ActivateContractDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';

@Controller('billing/contracts')
@UseGuards(AuthGuard, PermissionGuard)
export class BillingContractController {
  constructor(private readonly contractService: BillingContractService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('BILLING.CONTRACT.CREATE')
  async create(@Body() dto: CreateContractDto, @CurrentUser('id') userId: string) {
    const result = await this.contractService.create(dto, userId);
    return {
      success: true,
      data: result.data,
      meta: { isReplay: result.isReplay },
    };
  }

  @Get()
  @Permission('BILLING.CONTRACT.READ')
  async findMany(@Query() query: QueryContractDto) {
    const result = await this.contractService.findMany(query);
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
  @Permission('BILLING.CONTRACT.READ')
  async findById(@Param('id') id: string) {
    const contract = await this.contractService.findById(id);
    return {
      success: true,
      data: contract,
    };
  }

  @Put(':id')
  @Permission('BILLING.CONTRACT.UPDATE')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser('id') userId: string,
  ) {
    const contract = await this.contractService.update(id, dto, userId);
    return {
      success: true,
      data: contract,
    };
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Permission('BILLING.CONTRACT.UPDATE')
  async activate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const contract = await this.contractService.activate(id, userId);
    return {
      success: true,
      data: contract,
    };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('BILLING.CONTRACT.UPDATE')
  async deactivate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const contract = await this.contractService.deactivate(id, userId);
    return {
      success: true,
      data: contract,
    };
  }

  @Get(':id/fee-lines')
  @Permission('BILLING.CONTRACT.READ')
  async getFeeLines(@Param('id') id: string) {
    const feeLines = await this.contractService.getFeeLines(id);
    return {
      success: true,
      data: feeLines,
    };
  }
}
