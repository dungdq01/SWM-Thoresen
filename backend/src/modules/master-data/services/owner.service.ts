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
    // Wrap trong transaction để tránh race condition
    return this.prisma.$transaction(async (tx) => {
      // Generate code trong transaction
      const ownerCode = dto.ownerCode || await this.generateNextCode(tx);
      
      const existing = await tx.mdOwner.findUnique({ where: { ownerCode } });
      if (existing) {
        throw new ConflictException(`Owner code ${ownerCode} already exists`);
      }

      return tx.mdOwner.create({
        data: {
          ownerCode,
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
        },
      });
    });
  }

  private async generateNextCode(tx: any): Promise<string> {
    const prefix = 'OWN';
    const existing = await tx.mdOwner.findMany({
      where: { ownerCode: { startsWith: `${prefix}-` } },
      select: { ownerCode: true },
    });
    const numbers = existing
      .map((r: { ownerCode: string }) => parseInt(r.ownerCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
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

  async getNextCode(): Promise<string> {
    return this.ownerRepository.getNextCode();
  }
}
