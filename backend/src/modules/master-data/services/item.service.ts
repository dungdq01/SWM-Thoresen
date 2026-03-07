import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ItemRepository } from '../repositories/item.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateItemDto, UpdateItemDto, ListItemDto } from '../dto/item.dto';
import { MdItem } from '@prisma/client';

export { CreateItemDto, UpdateItemDto, ListItemDto };

@Injectable()
export class ItemService {
  constructor(private readonly itemRepository: ItemRepository) {}

  async create(dto: CreateItemDto, ctx: RequestContext): Promise<MdItem> {
    const existing = await this.itemRepository.findByCode(dto.itemCode);
    if (existing) throw new ConflictException(`Item code ${dto.itemCode} already exists`);

    return this.itemRepository.create({
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      itemNameEn: dto.itemNameEn,
      altItemCode: dto.altItemCode,
      productGroup: dto.productGroup,
      cargoForm: dto.cargoForm,
      category: dto.category,
      isPackaging: dto.isPackaging || false,
      baseUom: { connect: { id: dto.baseUomId } },
      billingUom: { connect: { id: dto.billingUomId } },
      catchWeightUom: dto.catchWeightUomId ? { connect: { id: dto.catchWeightUomId } } : undefined,
      stdGrossWeight: dto.stdGrossWeight,
      stdNetWeight: dto.stdNetWeight,
      densityMtPerM3: dto.densityMtPerM3,
      stdCubeM3: dto.stdCubeM3,
      tolerancePctInbound: dto.tolerancePctInbound,
      tolerancePctOutbound: dto.tolerancePctOutbound,
      shrinkageRatePct: dto.shrinkageRatePct,
      rotateBy: dto.rotateBy,
      shelfLifeDays: dto.shelfLifeDays,
      defaultZone: dto.defaultZoneId ? { connect: { id: dto.defaultZoneId } } : undefined,
      putawayStrategyKey: dto.putawayStrategyKey,
      defaultBagWeightKg: dto.defaultBagWeightKg,
      packagingMaterialItem: dto.packagingMaterialItemId ? { connect: { id: dto.packagingMaterialItemId } } : undefined,
      nominalQtyPerUnit: dto.nominalQtyPerUnit,
      hsCode: dto.hsCode,
      countryOfOrigin: dto.countryOfOrigin,
      isCatchWeight: dto.isCatchWeight || false,
      isStorageBillable: dto.isStorageBillable ?? true,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdItem> {
    const item = await this.itemRepository.findById(id);
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async findMany(dto: ListItemDto): Promise<PaginatedResult<MdItem>> {
    return this.itemRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateItemDto, ctx: RequestContext): Promise<MdItem> {
    const item = await this.findById(id);
    if (!item.isActive) throw new BadRequestException('Cannot update inactive item');

    return this.itemRepository.update(id, {
      itemName: dto.itemName,
      itemNameEn: dto.itemNameEn,
      altItemCode: dto.altItemCode,
      productGroup: dto.productGroup,
      category: dto.category,
      stdGrossWeight: dto.stdGrossWeight,
      stdNetWeight: dto.stdNetWeight,
      densityMtPerM3: dto.densityMtPerM3,
      stdCubeM3: dto.stdCubeM3,
      tolerancePctInbound: dto.tolerancePctInbound,
      tolerancePctOutbound: dto.tolerancePctOutbound,
      shrinkageRatePct: dto.shrinkageRatePct,
      rotateBy: dto.rotateBy,
      shelfLifeDays: dto.shelfLifeDays,
      defaultZone: dto.defaultZoneId ? { connect: { id: dto.defaultZoneId } } : undefined,
      putawayStrategyKey: dto.putawayStrategyKey,
      defaultBagWeightKg: dto.defaultBagWeightKg,
      packagingMaterialItem: dto.packagingMaterialItemId ? { connect: { id: dto.packagingMaterialItemId } } : undefined,
      nominalQtyPerUnit: dto.nominalQtyPerUnit,
      hsCode: dto.hsCode,
      countryOfOrigin: dto.countryOfOrigin,
      isStorageBillable: dto.isStorageBillable,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdItem> {
    const item = await this.findById(id);
    if (!item.isActive) throw new BadRequestException('Item is already inactive');
    return this.itemRepository.deactivate(id, ctx.userId!, item.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdItem> {
    const item = await this.findById(id);
    if (item.isActive) throw new BadRequestException('Item is already active');
    return this.itemRepository.reactivate(id, ctx.userId!, item.rowVersion);
  }

  async findAllActive(): Promise<MdItem[]> {
    return this.itemRepository.findAllActive();
  }
}
