import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { UomConversionRepository } from '../repositories/uom-conversion.repository';
import { CreateUomConversionDto, UpdateUomConversionDto, ListUomConversionDto } from '../dto/uom-conversion.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { LogService } from '../../foundation/services/log.service';

@Controller('master-data/uom-conversions')
@UseGuards(AuthGuard, PermissionGuard)
export class UomConversionController {
  constructor(
    private readonly uomConversionRepository: UomConversionRepository,
    private readonly logService: LogService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.uom.create')
  async create(@Body() dto: CreateUomConversionDto, @CurrentUser() user: RequestUser) {
    const result = await this.uomConversionRepository.create({
      fromUom: { connect: { id: dto.fromUomId } },
      toUom: { connect: { id: dto.toUomId } },
      conversionFactor: dto.conversionFactor,
      item: dto.itemId ? { connect: { id: dto.itemId } } : undefined,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await this.logService.createAuditLog({
      entityType: 'UOM_CONVERSION',
      entityId: result.id,
      action: 'CREATE',
      userId: user.id,
      newValue: result,
    });

    return result;
  }

  @Get()
  @Permission('master_data.uom.view')
  async findMany(@Query() dto: ListUomConversionDto) {
    return this.uomConversionRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      fromUomId: dto.fromUomId,
      toUomId: dto.toUomId,
      keyword: dto.keyword,
    });
  }

  @Get(':id')
  @Permission('master_data.uom.view')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const record = await this.uomConversionRepository.findById(id);
    if (!record) throw new NotFoundException(`UomConversion ${id} not found`);
    return record;
  }

  @Put(':id')
  @Permission('master_data.uom.update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUomConversionDto, @CurrentUser() user: RequestUser) {
    const record = await this.uomConversionRepository.findById(id);
    if (!record) throw new NotFoundException(`UomConversion ${id} not found`);

    const oldValue = { ...record };
    const result = await this.uomConversionRepository.update(
      id,
      {
        ...(dto.conversionFactor !== undefined && { conversionFactor: dto.conversionFactor }),
        updatedBy: user.id,
      },
      BigInt(dto.rowVersion),
    );

    await this.logService.createAuditLog({
      entityType: 'UOM_CONVERSION',
      entityId: id,
      action: 'UPDATE',
      userId: user.id,
      oldValue,
      newValue: result,
    });

    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('master_data.uom.update')
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const record = await this.uomConversionRepository.findById(id);
    if (!record) throw new NotFoundException(`UomConversion ${id} not found`);
    await this.uomConversionRepository.delete(id);

    await this.logService.createAuditLog({
      entityType: 'UOM_CONVERSION',
      entityId: id,
      action: 'DELETE',
      userId: user.id,
      oldValue: record,
    });
  }
}
