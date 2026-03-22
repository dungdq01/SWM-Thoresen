import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { OwnerWarehouseAccessRepository } from '../repositories/owner-warehouse-access.repository';
import { OwnerRepository } from '../repositories/owner.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { LogService } from '../../foundation/services/log.service';
import { AssignWarehouseDto, OwnerWarehouseAccessResponseDto } from '../dto/owner-warehouse-access.dto';

interface ServiceContext {
  userId?: string;
  correlationId?: string;
}

@Injectable()
export class OwnerWarehouseAccessService {
  constructor(
    private readonly accessRepository: OwnerWarehouseAccessRepository,
    private readonly ownerRepository: OwnerRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly logService: LogService,
  ) {}

  async assignWarehouse(
    ownerId: string,
    dto: AssignWarehouseDto,
    ctx: ServiceContext,
  ): Promise<OwnerWarehouseAccessResponseDto> {
    // Validate owner exists and is active
    const owner = await this.ownerRepository.findById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    if (!owner.isActive) {
      throw new BadRequestException('Cannot assign warehouse to inactive owner');
    }

    // Validate warehouse exists and is active
    const warehouse = await this.warehouseRepository.findById(dto.warehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (!warehouse.isActive) {
      throw new BadRequestException('Cannot assign inactive warehouse');
    }

    // Check if mapping already exists
    const existing = await this.accessRepository.findByOwnerAndWarehouse(ownerId, dto.warehouseId);
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Owner already has access to this warehouse');
      }
      // Reactivate existing mapping
      const result = await this.accessRepository.reactivate(existing.id, ctx.userId);
      await this.logService.createAuditLog({
        entityType: 'OWNER_WAREHOUSE_ACCESS',
        entityId: result.id,
        action: 'REACTIVATE',
        userId: ctx.userId,
        oldValue: existing,
        newValue: result,
      });
      return this.mapToResponse(result);
    }

    // Create new mapping
    const result = await this.accessRepository.create({
      ownerId,
      warehouseId: dto.warehouseId,
      createdBy: ctx.userId,
    });

    await this.logService.createAuditLog({
      entityType: 'OWNER_WAREHOUSE_ACCESS',
      entityId: result.id,
      action: 'CREATE',
      userId: ctx.userId,
      newValue: result,
    });

    return this.mapToResponse(result);
  }

  async removeWarehouseAccess(
    ownerId: string,
    warehouseId: string,
    ctx: ServiceContext,
  ): Promise<{ success: boolean; message: string }> {
    const access = await this.accessRepository.findByOwnerAndWarehouse(ownerId, warehouseId);
    if (!access) {
      throw new NotFoundException('Owner warehouse access not found');
    }

    if (!access.isActive) {
      throw new BadRequestException('Access already deactivated');
    }

    const result = await this.accessRepository.deactivate(access.id, ctx.userId);

    await this.logService.createAuditLog({
      entityType: 'OWNER_WAREHOUSE_ACCESS',
      entityId: access.id,
      action: 'DEACTIVATE',
      userId: ctx.userId,
      oldValue: access,
      newValue: result,
    });

    return {
      success: true,
      message: 'Warehouse access removed successfully',
    };
  }

  async getOwnerWarehouses(ownerId: string): Promise<OwnerWarehouseAccessResponseDto[]> {
    const owner = await this.ownerRepository.findById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    const accesses = await this.accessRepository.findByOwnerId(ownerId);
    return accesses.map((a) => this.mapToResponse(a));
  }

  async hasAccess(ownerId: string, warehouseId: string): Promise<boolean> {
    return this.accessRepository.hasAccess(ownerId, warehouseId);
  }

  async validateAccess(ownerId: string, warehouseId: string): Promise<void> {
    const hasAccess = await this.hasAccess(ownerId, warehouseId);
    if (!hasAccess) {
      throw new BadRequestException(`Owner does not have access to this warehouse`);
    }
  }

  private mapToResponse(data: any): OwnerWarehouseAccessResponseDto {
    return {
      id: data.id,
      ownerId: data.ownerId,
      ownerCode: data.owner?.ownerCode || '',
      ownerName: data.owner?.ownerName || '',
      warehouseId: data.warehouseId,
      warehouseCode: data.warehouse?.warehouseCode || '',
      warehouseName: data.warehouse?.warehouseName || '',
      isActive: data.isActive,
      rowVersion: Number(data.rowVersion),
      createdAt: data.createdAt,
    };
  }
}
