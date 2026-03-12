import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard, PermissionGuard, Permission } from '../../foundation/auth';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogsFilterDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 15;
}

@ApiTags('Reporting - Audit Trail')
@Controller('reporting/audit')
@UseGuards(AuthGuard, PermissionGuard)
export class AuditTrailController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.AUDIT_READ)
  @ApiOperation({ summary: 'Lấy danh sách audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs list' })
  async getAuditLogs(@Query() filters: AuditLogsFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters.entityId) {
      where.entityId = { contains: filters.entityId, mode: 'insensitive' };
    }
    if (filters.userId) {
      where.userId = { contains: filters.userId, mode: 'insensitive' };
    }
    if (filters.fromDate || filters.toDate) {
      where.occurredAt = {};
      if (filters.fromDate) {
        (where.occurredAt as Record<string, Date>).gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (where.occurredAt as Record<string, Date>).lte = new Date(filters.toDate + 'T23:59:59.999Z');
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        timestamp: log.occurredAt,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        userId: log.userId,
        userName: log.userRole || 'Unknown',
        changes: log.oldValue && log.newValue 
          ? { [log.fieldName || 'value']: { from: log.oldValue, to: log.newValue } }
          : null,
      })),
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
