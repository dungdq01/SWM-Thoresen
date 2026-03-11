import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ItemRepository } from '../repositories/item.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateItemDto, UpdateItemDto, ListItemDto } from '../dto/item.dto';
import { MdItem } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

export { CreateItemDto, UpdateItemDto, ListItemDto };

@Injectable()
export class ItemService {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateItemDto, ctx: RequestContext): Promise<MdItem> {
    const doCreate = async () => {
      // Validate itemCode is not empty
      if (!dto.itemCode || dto.itemCode.trim() === '') {
        throw new BadRequestException('Item code is required');
      }
      
      const existing = await this.itemRepository.findByCode(dto.itemCode);
      if (existing) throw new ConflictException(`Item code ${dto.itemCode} already exists`);

      // HI-3: FK pre-validation
      const baseUom = await this.prisma.mdUom.findUnique({ where: { id: dto.baseUomId } });
      if (!baseUom) throw new BadRequestException('Base UOM not found');
      const billingUom = await this.prisma.mdUom.findUnique({ where: { id: dto.billingUomId } });
      if (!billingUom) throw new BadRequestException('Billing UOM not found');
      if (dto.catchWeightUomId) {
        const catchUom = await this.prisma.mdUom.findUnique({ where: { id: dto.catchWeightUomId } });
        if (!catchUom) throw new BadRequestException('Catch weight UOM not found');
      }
      if (dto.defaultZoneId) {
        const zone = await this.prisma.mdZone.findUnique({ where: { id: dto.defaultZoneId } });
        if (!zone) throw new BadRequestException('Default zone not found');
      }
      if (dto.packagingMaterialItemId) {
        const pkgItem = await this.prisma.mdItem.findUnique({ where: { id: dto.packagingMaterialItemId } });
        if (!pkgItem) throw new BadRequestException('Packaging material item not found');
      }

      const result = await this.itemRepository.create({
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

      await this.logService.createAuditLog({
        entityType: 'ITEM',
        entityId: result.id,
        action: 'CREATE',
        userId: ctx.userId,
        newValue: result,
      });

      return result;
    };

    return doCreate();
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

    // HI-3: FK pre-validation
    if (dto.defaultZoneId) {
      const zone = await this.prisma.mdZone.findUnique({ where: { id: dto.defaultZoneId } });
      if (!zone) throw new BadRequestException('Default zone not found');
    }
    if (dto.packagingMaterialItemId) {
      const pkgItem = await this.prisma.mdItem.findUnique({ where: { id: dto.packagingMaterialItemId } });
      if (!pkgItem) throw new BadRequestException('Packaging material item not found');
    }

    const oldValue = { ...item };
    const result = await this.itemRepository.update(id, {
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

    await this.logService.createAuditLog({
      entityType: 'ITEM',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdItem> {
    const item = await this.findById(id);
    if (!item.isActive) throw new BadRequestException('Item is already inactive');
    
    const result = await this.itemRepository.deactivate(id, ctx.userId!, item.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'ITEM',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: item,
      newValue: result,
    });

    return result;
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdItem> {
    const item = await this.findById(id);
    if (item.isActive) throw new BadRequestException('Item is already active');
    
    const result = await this.itemRepository.reactivate(id, ctx.userId!, item.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'ITEM',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: item,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdItem[]> {
    return this.itemRepository.findAllActive();
  }

  async getNextCode(): Promise<string> {
    return this.itemRepository.getNextCode();
  }
}
