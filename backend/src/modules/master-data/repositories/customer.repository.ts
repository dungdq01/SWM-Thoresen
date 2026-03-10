import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdCustomer } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdCustomerCreateInput): Promise<MdCustomer> {
    return this.prisma.mdCustomer.create({ data });
  }

  async findById(id: string): Promise<MdCustomer | null> {
    return this.prisma.mdCustomer.findUnique({ where: { id } });
  }

  async findByCode(customerCode: string): Promise<MdCustomer | null> {
    return this.prisma.mdCustomer.findUnique({ where: { customerCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    customerGroup?: string;
    customerType?: string;
  }): Promise<PaginatedResult<MdCustomer>> {
    const { page = 1, pageSize = 20, keyword, isActive, customerGroup, customerType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdCustomerWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (customerGroup) where.customerGroup = customerGroup as any;
    if (customerType) where.customerType = customerType as any;
    if (keyword) {
      where.OR = [
        { customerCode: { contains: keyword, mode: 'insensitive' } },
        { customerName: { contains: keyword, mode: 'insensitive' } },
        { shortName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdCustomer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { customerCode: 'asc' },
      }),
      this.prisma.mdCustomer.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdCustomerUpdateInput, expectedVersion: bigint): Promise<MdCustomer> {
    return this.prisma.mdCustomer.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdCustomer> {
    return this.prisma.mdCustomer.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdCustomer> {
    return this.prisma.mdCustomer.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findAllActive(): Promise<MdCustomer[]> {
    return this.prisma.mdCustomer.findMany({
      where: { isActive: true },
      orderBy: { customerCode: 'asc' },
    });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'CUS';
    const existing = await this.prisma.mdCustomer.findMany({
      where: { customerCode: { startsWith: `${prefix}-` } },
      select: { customerCode: true },
    });
    const numbers = existing
      .map((r) => parseInt(r.customerCode.replace(`${prefix}-`, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
