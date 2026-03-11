import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VendorRepository } from '../repositories/vendor.repository';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { CreateVendorDto, UpdateVendorDto, ListVendorDto } from '../dto/vendor.dto';
import { MdVendor } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { IdempotencyService } from '../../foundation/services/idempotency.service';

export { CreateVendorDto, UpdateVendorDto, ListVendorDto };

@Injectable()
export class VendorService {
  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateVendorDto, ctx: RequestContext): Promise<MdVendor> {
    const existing = await this.vendorRepository.findByCode(dto.vendorCode);
    if (existing) throw new ConflictException(`Vendor code ${dto.vendorCode} already exists`);

    const result = await this.vendorRepository.create({
      vendorCode: dto.vendorCode,
      vendorName: dto.vendorName,
      supplierGroup: dto.supplierGroup,
      countryRegion: dto.countryRegion,
      vesselName: dto.vesselName,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      taxCode: dto.taxCode,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'VENDOR',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return result;
  }

  async findById(id: string): Promise<MdVendor> {
    const vendor = await this.vendorRepository.findById(id);
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async findMany(dto: ListVendorDto): Promise<PaginatedResult<MdVendor>> {
    return this.vendorRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateVendorDto, ctx: RequestContext): Promise<MdVendor> {
    const vendor = await this.findById(id);
    if (!vendor.isActive) throw new BadRequestException('Cannot update inactive vendor');

    const oldValue = { ...vendor };
    const result = await this.vendorRepository.update(id, {
      vendorName: dto.vendorName,
      supplierGroup: dto.supplierGroup,
      countryRegion: dto.countryRegion,
      vesselName: dto.vesselName,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      taxCode: dto.taxCode,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'VENDOR',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdVendor> {
    const vendor = await this.findById(id);
    if (!vendor.isActive) throw new BadRequestException('Vendor is already inactive');
    const result = await this.vendorRepository.deactivate(id, ctx.userId!, vendor.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'VENDOR',
      entityId: id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: vendor,
      newValue: result,
    });

    return result;
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdVendor> {
    const vendor = await this.findById(id);
    if (vendor.isActive) throw new BadRequestException('Vendor is already active');
    const result = await this.vendorRepository.reactivate(id, ctx.userId!, vendor.rowVersion);

    await this.logService.createAuditLog({
      entityType: 'VENDOR',
      entityId: id,
      action: 'REACTIVATE',
      userId: ctx.userId,
      oldValue: vendor,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdVendor[]> {
    return this.vendorRepository.findAllActive();
  }

  async getNextCode(): Promise<string> {
    return this.vendorRepository.getNextCode();
  }
}
