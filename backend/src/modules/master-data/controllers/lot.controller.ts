import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { LotService } from '../services/lot.service';
import { CreateLotDto, UpdateLotDto, ListLotDto, GetOrCreateLotDto } from '../dto/lot.dto';
import { DeactivateDto, ReactivateDto } from '../dto/common.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/lots')
@UseGuards(AuthGuard, PermissionGuard)
export class LotController {
  constructor(private readonly lotService: LotService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.lot.create')
  async create(@Body() dto: CreateLotDto, @CurrentUser() user: RequestUser) {
    return this.lotService.create(dto, { userId: user.id });
  }

  @Post('get-or-create')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.lot.create')
  async getOrCreate(@Body() dto: GetOrCreateLotDto, @CurrentUser() user: RequestUser) {
    return this.lotService.getOrCreate(dto, { userId: user.id });
  }

  @Get('next-code')
  @Permission('master_data.lot.view')
  async getNextCode() {
    const code = await this.lotService.getNextCode();
    return { code };
  }

  @Get()
  @Permission('master_data.lot.view')
  async findMany(@Query() dto: ListLotDto) {
    return this.lotService.findMany(dto);
  }

  @Get('fifo')
  @Permission('master_data.lot.view')
  async findActiveByFIFO(
    @Query('itemId', ParseUUIDPipe) itemId: string,
    @Query('ownerId', ParseUUIDPipe) ownerId: string,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ) {
    return this.lotService.findActiveByFIFO(itemId, ownerId, warehouseId);
  }

  @Get(':id')
  @Permission('master_data.lot.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.lotService.findById(id);
  }

  @Get(':id/traceability')
  @Permission('master_data.lot.view')
  async getTraceability(@Param('id', ParseUUIDPipe) id: string) {
    return this.lotService.getTraceability(id);
  }

  @Get(':id/derived-lots')
  @Permission('master_data.lot.view')
  async getDerivedLots(@Param('id', ParseUUIDPipe) id: string) {
    return this.lotService.getDerivedLots(id);
  }

  @Get('by-code/:lotCode')
  @Permission('master_data.lot.view')
  async findByCode(@Param('lotCode') lotCode: string) {
    return this.lotService.findByCode(lotCode);
  }

  @Get('by-hash/:lotHash')
  @Permission('master_data.lot.view')
  async findByHash(@Param('lotHash') lotHash: string) {
    const lot = await this.lotService.findByHash(lotHash);
    if (!lot) {
      return { found: false, lot: null };
    }
    return { found: true, lot };
  }

  @Put(':id')
  @Permission('master_data.lot.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLotDto, @CurrentUser() user: RequestUser) {
    return this.lotService.update(id, dto, { userId: user.id });
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.lot.deactivate')
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeactivateDto, @CurrentUser() user: RequestUser) {
    return this.lotService.deactivate(id, dto, { userId: user.id });
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.lot.reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactivateDto, @CurrentUser() user: RequestUser) {
    return this.lotService.reactivate(id, dto, { userId: user.id });
  }
}
