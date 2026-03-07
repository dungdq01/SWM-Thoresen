import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryStatusRepository } from '../repositories/inventory-status.repository';
import { PaginatedResult, RequestContext } from '../dto/common.dto';
import { UpdateInventoryStatusDto, ListInventoryStatusDto } from '../dto/inventory-status.dto';
import { MdInventoryStatus } from '@prisma/client';

export { UpdateInventoryStatusDto, ListInventoryStatusDto };

@Injectable()
export class InventoryStatusService {
  constructor(private readonly inventoryStatusRepository: InventoryStatusRepository) {}

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

    return this.inventoryStatusRepository.update(id, {
      description: dto.description,
      displayOrder: dto.displayOrder,
      updatedBy: ctx.userId,
    }, BigInt(dto.rowVersion));
  }

  async findAllActive(): Promise<MdInventoryStatus[]> {
    return this.inventoryStatusRepository.findAllActive();
  }

  async findAllocatable(): Promise<MdInventoryStatus[]> {
    return this.inventoryStatusRepository.findAllocatable();
  }
}
