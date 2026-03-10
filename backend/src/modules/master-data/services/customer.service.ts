import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomerRepository } from '../repositories/customer.repository';
import { CreateCustomerDto, UpdateCustomerDto, ListCustomerDto } from '../dto/customer.dto';
import { DeactivateDto, ReactivateDto, PaginatedResult, RequestContext } from '../dto/common.dto';
import { MdCustomer } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(dto: CreateCustomerDto, ctx: RequestContext): Promise<MdCustomer> {
    const existing = await this.customerRepository.findByCode(dto.customerCode);
    if (existing) {
      throw new ConflictException(`Customer code ${dto.customerCode} already exists`);
    }
    return this.customerRepository.create({
      customerCode: dto.customerCode,
      customerName: dto.customerName,
      shortName: dto.shortName,
      customerGroup: dto.customerGroup,
      customerType: dto.customerType,
      taxCode: dto.taxCode,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      notes: dto.notes,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  async findById(id: string): Promise<MdCustomer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async findMany(dto: ListCustomerDto): Promise<PaginatedResult<MdCustomer>> {
    return this.customerRepository.findMany({
      page: dto.page,
      pageSize: dto.pageSize,
      keyword: dto.keyword,
      isActive: dto.isActive,
      customerGroup: dto.customerGroup,
      customerType: dto.customerType,
    });
  }

  async update(id: string, dto: UpdateCustomerDto, ctx: RequestContext): Promise<MdCustomer> {
    const customer = await this.findById(id);
    if (!customer.isActive) throw new BadRequestException('Cannot update inactive customer');
    return this.customerRepository.update(
      id,
      {
        customerName: dto.customerName,
        shortName: dto.shortName,
        customerGroup: dto.customerGroup,
        customerType: dto.customerType,
        taxCode: dto.taxCode,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        updatedBy: ctx.userId,
      },
      BigInt(dto.rowVersion),
    );
  }

  async deactivate(id: string, dto: DeactivateDto, ctx: RequestContext): Promise<MdCustomer> {
    const customer = await this.findById(id);
    if (!customer.isActive) throw new BadRequestException('Customer is already inactive');
    return this.customerRepository.deactivate(id, ctx.userId!, customer.rowVersion);
  }

  async reactivate(id: string, dto: ReactivateDto, ctx: RequestContext): Promise<MdCustomer> {
    const customer = await this.findById(id);
    if (customer.isActive) throw new BadRequestException('Customer is already active');
    return this.customerRepository.reactivate(id, ctx.userId!, customer.rowVersion);
  }

  async findAllActive(): Promise<MdCustomer[]> {
    return this.customerRepository.findAllActive();
  }

  async getNextCode(): Promise<string> {
    return this.customerRepository.getNextCode();
  }
}
