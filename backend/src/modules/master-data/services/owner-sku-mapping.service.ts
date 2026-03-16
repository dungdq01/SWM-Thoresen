import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OwnerSkuMappingRepository } from '../repositories/owner-sku-mapping.repository';
import { CreateOwnerSkuMappingDto, UpdateOwnerSkuMappingDto, ListOwnerSkuMappingDto } from '../dto/owner-sku-mapping.dto';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdOwnerSkuMapping } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class OwnerSkuMappingService {
  constructor(
    private readonly repo: OwnerSkuMappingRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateOwnerSkuMappingDto, ctx: RequestContext): Promise<MdOwnerSkuMapping> {
    const owner = await this.prisma.mdOwner.findUnique({ where: { id: dto.ownerId } });
    if (!owner) throw new BadRequestException('Owner not found');
    const item = await this.prisma.mdItem.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new BadRequestException('Item not found');

    if (dto.mappingCode) {
      const existing = await this.repo.findByCode(dto.mappingCode);
      if (existing) throw new ConflictException(`Mapping code ${dto.mappingCode} already exists`);
    }

    const mappingCode = dto.mappingCode || await this.repo.getNextCode();

    const result = await this.repo.create({
      mappingCode,
      ownerId: dto.ownerId,
      itemId: dto.itemId,
      ownerSkuCode: dto.ownerSkuCode,
      ownerSkuName: dto.ownerSkuName,
      billingClass: dto.billingClass,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({ entityType: 'OWNER_SKU_MAPPING', entityId: result.id, action: 'CREATE', userId: ctx.userId, newValue: result });
    return result;
  }

  async findById(id: string): Promise<MdOwnerSkuMapping> {
    const m = await this.repo.findById(id);
    if (!m) throw new NotFoundException(`Owner-SKU mapping ${id} not found`);
    return m;
  }

  async findMany(dto: ListOwnerSkuMappingDto): Promise<PaginatedResult<MdOwnerSkuMapping>> {
    return this.repo.findMany(dto);
  }

  async update(id: string, dto: UpdateOwnerSkuMappingDto, ctx: RequestContext): Promise<MdOwnerSkuMapping> {
    const m = await this.findById(id);
    const oldValue = { ...m };
    const result = await this.repo.update(id, {
      ownerSkuCode: dto.ownerSkuCode,
      ownerSkuName: dto.ownerSkuName,
      billingClass: dto.billingClass,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({ entityType: 'OWNER_SKU_MAPPING', entityId: id, action: 'UPDATE', userId: ctx.userId, oldValue, newValue: result });
    return result;
  }

  async delete(id: string, ctx: RequestContext): Promise<MdOwnerSkuMapping> {
    const m = await this.findById(id);
    const result = await this.repo.delete(id);
    await this.logService.createAuditLog({ entityType: 'OWNER_SKU_MAPPING', entityId: id, action: 'DELETE', userId: ctx.userId, oldValue: m });
    return result;
  }

  async getNextCode(): Promise<string> {
    return this.repo.getNextCode();
  }
}
