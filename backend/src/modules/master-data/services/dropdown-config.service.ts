import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DropdownConfigRepository } from '../repositories/dropdown-config.repository';
import { CreateDropdownConfigDto, UpdateDropdownConfigDto, ListDropdownConfigDto } from '../dto/dropdown-config.dto';
import { DropdownConfig } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const ENTITY_FIELDS: Record<string, Array<{ value: string; label: string }>> = {
  owner:     [{ value: 'ownerGroup', label: 'Nhóm chủ hàng' }, { value: 'ownerType', label: 'Loại chủ hàng' }],
  vendor:    [{ value: 'supplierGroup', label: 'Nhóm nhà cung cấp' }],
  item:      [{ value: 'cargoForm', label: 'Dạng hàng' }, { value: 'productGroup', label: 'Nhóm sản phẩm' }],
  warehouse: [{ value: 'warehouseType', label: 'Loại kho' }],
  customer:  [{ value: 'customerGroup', label: 'Nhóm khách hàng' }, { value: 'customerType', label: 'Loại khách hàng' }],
};

@Injectable()
export class DropdownConfigService {
  constructor(
    private readonly dropdownConfigRepository: DropdownConfigRepository,
    private readonly prisma: PrismaService,
  ) {}

  getEntities() {
    return {
      data: [
        { value: 'owner', label: 'Chủ hàng (Owner)' },
        { value: 'vendor', label: 'Nhà cung cấp (Vendor)' },
        { value: 'item', label: 'Mặt hàng (Item)' },
        { value: 'warehouse', label: 'Kho (Warehouse)' },
        { value: 'customer', label: 'Khách hàng (Customer)' },
      ],
    };
  }

  getFields(entity: string) {
    const fields = ENTITY_FIELDS[entity];
    if (!fields) throw new NotFoundException(`Entity "${entity}" not found`);
    return { data: fields };
  }

  async create(dto: CreateDropdownConfigDto): Promise<DropdownConfig> {
    const normalizedValue = dto.value.toUpperCase();
    const sortOrder = dto.sortOrder ?? (await this.dropdownConfigRepository.getNextSortOrder(dto.entity, dto.fieldName));
    return this.dropdownConfigRepository.create({
      entity: dto.entity,
      fieldName: dto.fieldName,
      value: normalizedValue,
      label: dto.label,
      sortOrder,
    });
  }

  async findById(id: string): Promise<DropdownConfig> {
    const config = await this.dropdownConfigRepository.findById(id);
    if (!config) throw new NotFoundException(`DropdownConfig ${id} not found`);
    return config;
  }

  async findMany(dto: ListDropdownConfigDto): Promise<PaginatedResult<DropdownConfig>> {
    return this.dropdownConfigRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      entity: dto.entity,
      fieldName: dto.fieldName,
      keyword: dto.keyword,
      isActive: dto.isActive,
    });
  }

  async update(id: string, dto: UpdateDropdownConfigDto): Promise<DropdownConfig> {
    await this.findById(id);
    return this.dropdownConfigRepository.update(id, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    // Check if value is currently in use
    await this.checkValueInUse(config.entity, config.fieldName, config.value);
    await this.dropdownConfigRepository.delete(id);
  }

  async setDefault(id: string): Promise<DropdownConfig> {
    await this.findById(id);
    return this.dropdownConfigRepository.setDefault(id);
  }

  async getDropdownOptions(entity: string, fieldName: string) {
    const options = await this.dropdownConfigRepository.findActiveOptions(entity, fieldName);
    return {
      data: options.map((o) => ({ value: o.value, label: o.label, isDefault: o.isDefault })),
    };
  }

  private async checkValueInUse(entity: string, fieldName: string, value: string): Promise<void> {
    let count = 0;
    if (entity === 'owner' && fieldName === 'ownerGroup') {
      count = await this.prisma.mdOwner.count({ where: { ownerGroup: value } });
    } else if (entity === 'vendor' && fieldName === 'supplierGroup') {
      count = await this.prisma.mdVendor.count({ where: { supplierGroup: value as any } });
    } else if (entity === 'item' && fieldName === 'productGroup') {
      count = await this.prisma.mdItem.count({ where: { productGroup: value } });
    } else if (entity === 'item' && fieldName === 'cargoForm') {
      count = await this.prisma.mdItem.count({ where: { cargoForm: value as any } });
    } else if (entity === 'warehouse' && fieldName === 'warehouseType') {
      count = await this.prisma.mdWarehouse.count({ where: { warehouseType: value as any } });
    } else if (entity === 'customer' && fieldName === 'customerGroup') {
      count = await this.prisma.mdCustomer.count({ where: { customerGroup: value as any } });
    } else if (entity === 'customer' && fieldName === 'customerType') {
      count = await this.prisma.mdCustomer.count({ where: { customerType: value as any } });
    }

    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete: value "${value}" is currently used by ${count} ${entity} record(s)`,
      );
    }
  }
}
