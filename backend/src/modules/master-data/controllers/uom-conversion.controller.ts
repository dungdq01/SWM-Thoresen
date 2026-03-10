import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { UomConversionRepository } from '../repositories/uom-conversion.repository';
import { CreateUomConversionDto, UpdateUomConversionDto, ListUomConversionDto } from '../dto/uom-conversion.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/uom-conversions')
@UseGuards(AuthGuard, PermissionGuard)
export class UomConversionController {
  constructor(private readonly uomConversionRepository: UomConversionRepository) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.uom.create')
  async create(@Body() dto: CreateUomConversionDto, @CurrentUser() user: RequestUser) {
    return this.uomConversionRepository.create({
      fromUom: { connect: { id: dto.fromUomId } },
      toUom: { connect: { id: dto.toUomId } },
      conversionFactor: dto.conversionFactor,
      item: dto.itemId ? { connect: { id: dto.itemId } } : undefined,
      createdBy: user.id,
      updatedBy: user.id,
    });
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
    return this.uomConversionRepository.update(
      id,
      {
        ...(dto.conversionFactor !== undefined && { conversionFactor: dto.conversionFactor }),
        updatedBy: user.id,
      },
      BigInt(dto.rowVersion),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('master_data.uom.update')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    const record = await this.uomConversionRepository.findById(id);
    if (!record) throw new NotFoundException(`UomConversion ${id} not found`);
    await this.uomConversionRepository.delete(id);
  }
}
