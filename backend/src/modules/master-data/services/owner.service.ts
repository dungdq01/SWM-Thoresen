import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OwnerRepository } from '../repositories/owner.repository';
import { CreateOwnerDto, UpdateOwnerDto, ListOwnerDto } from '../dto/owner.dto';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdOwner } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

@Injectable()
export class OwnerService {
  constructor(
    private readonly ownerRepository: OwnerRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateOwnerDto, ctx: RequestContext): Promise<MdOwner> {
    const existing = await this.ownerRepository.findByCode(dto.ownerCode);
    if (existing) {
      throw new ConflictException(`Owner code ${dto.ownerCode} already exists`);
    }

    return this.ownerRepository.create({
      ownerCode: dto.ownerCode,
      ownerName: dto.ownerName,
      shortName: dto.shortName,
      ownerGroup: dto.ownerGroup,
      ownerType: dto.ownerType,
      taxCode: dto.taxCode,
      address: dto.address,
      billingEmail: dto.billingEmail,
      billingContact: dto.billingContact,
      paymentTerms: dto.paymentTerms,
      defaultTolerancePct: dto.defaultTolerancePct,
      defaultWarehouse: dto.defaultWarehouseId ? { connect: { id: dto.defaultWarehouseId } } : undefined,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdOwner> {
    const owner = await this.ownerRepository.findById(id);
    if (!owner) throw new NotFoundException(`Owner ${id} not found`);
    return owner;
  }

  async findMany(dto: ListOwnerDto): Promise<PaginatedResult<MdOwner>> {
    return this.ownerRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      keyword: dto.keyword,
      isActive: dto.isActive,
      ownerGroup: dto.ownerGroup,
      ownerType: dto.ownerType,
    });
  }

  async update(id: string, dto: UpdateOwnerDto, ctx: RequestContext): Promise<MdOwner> {
    const owner = await this.findById(id);
    if (!owner.isActive) throw new BadRequestException('Cannot update inactive owner');

    return this.ownerRepository.update(
      id,
      {
        ownerName: dto.ownerName,
        shortName: dto.shortName,
        ownerGroup: dto.ownerGroup,
        ownerType: dto.ownerType,
        taxCode: dto.taxCode,
        address: dto.address,
        billingEmail: dto.billingEmail,
        billingContact: dto.billingContact,
        paymentTerms: dto.paymentTerms,
        defaultTolerancePct: dto.defaultTolerancePct,
        defaultWarehouse: dto.defaultWarehouseId ? { connect: { id: dto.defaultWarehouseId } } : undefined,
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdOwner> {
    const owner = await this.findById(id);
    if (!owner.isActive) throw new BadRequestException('Owner is already inactive');
    return this.ownerRepository.deactivate(id, ctx.userId!, owner.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdOwner> {
    const owner = await this.findById(id);
    if (owner.isActive) throw new BadRequestException('Owner is already active');
    return this.ownerRepository.reactivate(id, ctx.userId!, owner.rowVersion);
  }

  async findAllActive(): Promise<MdOwner[]> {
    return this.ownerRepository.findAllActive();
  }
}
