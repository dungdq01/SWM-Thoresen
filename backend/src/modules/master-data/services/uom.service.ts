import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UomRepository } from '../repositories/uom.repository';
import { DeactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateUomDto, UpdateUomDto, ListUomDto } from '../dto/uom.dto';
import { MdUom } from '@prisma/client';

export { CreateUomDto, UpdateUomDto, ListUomDto };

@Injectable()
export class UomService {
  constructor(private readonly uomRepository: UomRepository) {}

  async create(dto: CreateUomDto, ctx: RequestContext): Promise<MdUom> {
    const existing = await this.uomRepository.findByCode(dto.uomCode);
    if (existing) throw new ConflictException(`UOM code ${dto.uomCode} already exists`);

    return this.uomRepository.create({
      uomCode: dto.uomCode,
      description: dto.description,
      uomClass: dto.uomClass,
      isBaseUom: dto.isBaseUom || false,
      decimalPrecision: dto.decimalPrecision || 2,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdUom> {
    const uom = await this.uomRepository.findById(id);
    if (!uom) throw new NotFoundException(`UOM ${id} not found`);
    return uom;
  }

  async findMany(dto: ListUomDto): Promise<PaginatedResult<MdUom>> {
    return this.uomRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateUomDto, ctx: RequestContext): Promise<MdUom> {
    const uom = await this.findById(id);
    if (!uom.isActive) throw new BadRequestException('Cannot update inactive UOM');

    return this.uomRepository.update(id, {
      description: dto.description,
      decimalPrecision: dto.decimalPrecision,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdUom> {
    const uom = await this.findById(id);
    if (!uom.isActive) throw new BadRequestException('UOM is already inactive');
    return this.uomRepository.deactivate(id, ctx.userId!, uom.rowVersion);
  }

  async findAllActive(): Promise<MdUom[]> {
    return this.uomRepository.findAllActive();
  }
}
