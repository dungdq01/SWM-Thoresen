import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryStatusRepository } from '../repositories/inventory-status.repository';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { UpdateInventoryStatusDto, ListInventoryStatusDto } from '../dto/inventory-status.dto';
import { MdInventoryStatus } from '@prisma/client';
import { LogService } from '../../foundation/services/log.service';

export { UpdateInventoryStatusDto, ListInventoryStatusDto };

@Injectable()
export class InventoryStatusService {
  constructor(
    private readonly inventoryStatusRepository: InventoryStatusRepository,
    private readonly logService: LogService,
  ) {}

  async findById(id: string): Promise<MdInventoryStatus> {
    const status = await this.inventoryStatusRepository.findById(id);
    if (!status) throw new NotFoundException(`Inventory status ${id} not found`);
    return status;
  }

  async findMany(dto: ListInventoryStatusDto): Promise<PaginatedResult<MdInventoryStatus>> {
    return this.inventoryStatusRepository.findMany(dto);
  }

  async update(id: string, dto: UpdateInventoryStatusDto, ctx: RequestContext): Promise<MdInventoryStatus> {
    const status = await this.findById(id);
    if (status.isSystemLocked) throw new BadRequestException('Cannot modify system-locked inventory status');

    const oldValue = { ...status };
    const result = await this.inventoryStatusRepository.update(id, {
      description: dto.description,
      displayOrder: dto.displayOrder,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));

    await this.logService.createAuditLog({
      entityType: 'INVENTORY_STATUS',
      entityId: id,
      action: 'UPDATE',
      userId: ctx.userId,
      oldValue,
      newValue: result,
    });

    return result;
  }

  async findAllActive(): Promise<MdInventoryStatus[]> {
    return this.inventoryStatusRepository.findAllActive();
  }

  async findAllocatable(): Promise<MdInventoryStatus[]> {
    return this.inventoryStatusRepository.findAllocatable();
  }
}
