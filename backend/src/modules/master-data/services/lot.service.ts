import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { LotRepository } from '../repositories/lot.repository';
import { CreateLotDto, UpdateLotDto, ListLotDto, GetOrCreateLotDto } from '../dto/lot.dto';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdLot, LotStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';

@Injectable()
export class LotService {
  constructor(
    private readonly lotRepository: LotRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  async create(dto: CreateLotDto, ctx: RequestContext): Promise<MdLot> {
    // FK pre-validation
    const [item, owner, warehouse] = await Promise.all([
      this.prisma.mdItem.findUnique({ where: { id: dto.itemId } }),
      this.prisma.mdOwner.findUnique({ where: { id: dto.ownerId } }),
      this.prisma.mdWarehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);

    if (!item) throw new BadRequestException('Item not found');
    if (!owner) throw new BadRequestException('Owner not found');
    if (!warehouse) throw new BadRequestException('Warehouse not found');

    // Validate source lot if provided
    if (dto.sourceLotId) {
      const sourceLot = await this.prisma.mdLot.findUnique({ where: { id: dto.sourceLotId } });
      if (!sourceLot) throw new BadRequestException('Source lot not found');
    }

    // Generate lot hash
    const lotHash = this.lotRepository.generateLotHash(dto.itemId, dto.ownerId, dto.warehouseId, dto.attributes);

    // Wrap trong transaction để tránh race condition
    const result = await this.prisma.$transaction(async (tx) => {
      // Check if lot with same hash already exists
      const existingByHash = await tx.mdLot.findUnique({ where: { lotHash } });
      if (existingByHash) {
        throw new ConflictException(`Lot with same hash already exists: ${existingByHash.lotCode}`);
      }

      // Generate code trong transaction
      const lotCode = dto.lotCode || await this.generateNextCode(tx);
      
      const existingByCode = await tx.mdLot.findUnique({ where: { lotCode } });
      if (existingByCode) {
        throw new ConflictException(`Lot code ${lotCode} already exists`);
      }

      return tx.mdLot.create({
        data: {
          lotCode,
          item: { connect: { id: dto.itemId } },
          owner: { connect: { id: dto.ownerId } },
          warehouse: { connect: { id: dto.warehouseId } },
          firstReceivedDate: dto.firstReceivedDate ? new Date(dto.firstReceivedDate) : new Date(),
          sourceLot: dto.sourceLotId ? { connect: { id: dto.sourceLotId } } : undefined,
          lotHash,
          status: LotStatus.ACTIVE,
          attributes: dto.attributes,
          notes: dto.notes,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        },
        include: {
          item: true,
          owner: true,
          warehouse: true,
          sourceLot: true,
        },
      });
    });

    await this.logService.createAuditLog({
      entityType: 'LOT',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async getOrCreate(dto: GetOrCreateLotDto, ctx: RequestContext): Promise<{ lot: MdLot; created: boolean }> {
    // Generate lot hash to check if lot exists
    const lotHash = this.lotRepository.generateLotHash(dto.itemId, dto.ownerId, dto.warehouseId, dto.attributes);

    // Try to find existing lot
    const existingLot = await this.lotRepository.findByHash(lotHash);
    if (existingLot) {
      return { lot: existingLot, created: false };
    }

    // Create new lot
    const newLot = await this.create({
      itemId: dto.itemId,
      ownerId: dto.ownerId,
      warehouseId: dto.warehouseId,
      attributes: dto.attributes,
      firstReceivedDate: dto.firstReceivedDate,
    }, ctx);

    return { lot: newLot, created: true };
  }

  private async generateNextCode(tx: any): Promise<string> {
    const prefix = 'LOT';
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const searchPrefix = `${prefix}-${dateStr}-`;
    
    const existing = await tx.mdLot.findMany({
      where: { lotCode: { startsWith: searchPrefix } },
      select: { lotCode: true },
    });
    
    const numbers = existing
      .map((r: { lotCode: string }) => parseInt(r.lotCode.replace(searchPrefix, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${searchPrefix}${String(nextNum).padStart(4, '0')}`;
  }

  async findById(id: string): Promise<MdLot> {
    const lot = await this.lotRepository.findById(id);
    if (!lot) throw new NotFoundException(`Lot ${id} not found`);
    return lot;
  }

  async findByCode(lotCode: string): Promise<MdLot> {
    const lot = await this.lotRepository.findByCode(lotCode);
    if (!lot) throw new NotFoundException(`Lot ${lotCode} not found`);
    return lot;
  }

  async findByHash(lotHash: string): Promise<MdLot | null> {
    return this.lotRepository.findByHash(lotHash);
  }

  async findMany(dto: ListLotDto): Promise<PaginatedResult<MdLot>> {
    return this.lotRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      keyword: dto.keyword,
      isActive: dto.isActive,
      itemId: dto.itemId,
      ownerId: dto.ownerId,
      warehouseId: dto.warehouseId,
      status: dto.status,
      sourceLotId: dto.sourceLotId,
    });
  }

  async update(id: string, dto: UpdateLotDto, ctx: RequestContext): Promise<MdLot> {
    const lot = await this.findById(id);
    if (!lot.isActive) throw new BadRequestException('Cannot update inactive lot');

    const oldValue = { ...lot };
    const result = await this.lotRepository.update(
      id,
      {
        status: dto.status,
        attributes: dto.attributes,
        notes: dto.notes,
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );

    await this.logService.createAuditLog({
      entityType: 'LOT',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdLot> {
    const lot = await this.findById(id);
    if (!lot.isActive) throw new BadRequestException('Lot is already inactive');
    
    const result = await this.lotRepository.deactivate(id, ctx.userId!, lot.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'LOT',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: lot,
      newValue: result,
    });

    return result;
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdLot> {
    const lot = await this.findById(id);
    if (lot.isActive) throw new BadRequestException('Lot is already active');
    
    const result = await this.lotRepository.reactivate(id, ctx.userId!, lot.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'LOT',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: lot,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdLot[]> {
    return this.lotRepository.findAllActive();
  }

  async findActiveByFIFO(itemId: string, ownerId: string, warehouseId: string): Promise<MdLot[]> {
    return this.lotRepository.findActiveByFIFO({ itemId, ownerId, warehouseId });
  }

  async getNextCode(): Promise<string> {
    return this.lotRepository.getNextCode();
  }

  async getDerivedLots(id: string): Promise<MdLot[]> {
    const lot = await this.findById(id);
    return this.prisma.mdLot.findMany({
      where: { sourceLotId: id },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTraceability(id: string): Promise<{ sourceLots: MdLot[]; derivedLots: MdLot[] }> {
    const lot = await this.findById(id);
    
    // Get source chain (upward)
    const sourceLots: MdLot[] = [];
    let currentSourceId = lot.sourceLotId;
    while (currentSourceId) {
      const sourceLot = await this.prisma.mdLot.findUnique({
        where: { id: currentSourceId },
        include: {
          item: true,
          owner: true,
          warehouse: true,
        },
      });
      if (sourceLot) {
        sourceLots.push(sourceLot);
        currentSourceId = sourceLot.sourceLotId;
      } else {
        break;
      }
    }

    // Get derived lots (downward)
    const derivedLots = await this.getDerivedLots(id);

    return { sourceLots, derivedLots };
  }
}
