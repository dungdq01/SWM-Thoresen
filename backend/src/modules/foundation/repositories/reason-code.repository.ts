import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ReasonCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { domainCode?: string; category?: string; isActive?: boolean }) {
    const where: Prisma.ReasonCodeWhereInput = {
      ...(filters.domainCode ? { domainCode: filters.domainCode } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    return this.prisma.reasonCode.findMany({
      where,
      orderBy: [{ domainCode: 'asc' }, { category: 'asc' }, { code: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.reasonCode.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.reasonCode.findUnique({ where: { code } });
  }

  create(data: {
    code: string;
    description: string;
    category: string;
    domainCode: string;
    requiresApproval?: boolean;
    affectsBilling?: boolean;
    requiresNote?: boolean;
    sortOrder?: number;
    actorUserId: string;
  }) {
    return this.prisma.reasonCode.create({
      data: {
        code: data.code,
        description: data.description,
        category: data.category,
        domainCode: data.domainCode,
        requiresApproval: data.requiresApproval ?? false,
        affectsBilling: data.affectsBilling ?? false,
        requiresNote: data.requiresNote ?? false,
        sortOrder: data.sortOrder ?? 0,
        createdBy: data.actorUserId,
        updatedBy: data.actorUserId,
      },
    });
  }

  update(
    id: string,
    data: {
      description?: string;
      category?: string;
      domainCode?: string;
      requiresApproval?: boolean;
      affectsBilling?: boolean;
      requiresNote?: boolean;
      sortOrder?: number;
      isActive?: boolean;
      actorUserId: string;
    },
  ) {
    return this.prisma.reasonCode.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.domainCode !== undefined ? { domainCode: data.domainCode } : {}),
        ...(data.requiresApproval !== undefined
          ? { requiresApproval: data.requiresApproval }
          : {}),
        ...(data.affectsBilling !== undefined
          ? { affectsBilling: data.affectsBilling }
          : {}),
        ...(data.requiresNote !== undefined ? { requiresNote: data.requiresNote } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedBy: data.actorUserId,
      },
    });
  }
}
