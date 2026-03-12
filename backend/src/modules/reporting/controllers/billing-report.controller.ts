import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard, PermissionGuard, Permission } from '../../foundation/auth';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@ApiTags('Reporting - Billing Reports')
@Controller('reporting/billing')
@UseGuards(AuthGuard, PermissionGuard)
export class BillingReportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.BILLING_READ)
  @ApiOperation({ summary: 'Báo cáo tổng hợp billing' })
  @ApiResponse({ status: 200, description: 'Billing summary report' })
  async getBillingSummary() {
    // Get debit notes summary
    const debitNotes = await this.prisma.bilDebitNote.findMany({
      select: {
        id: true,
        status: true,
        grandTotal: true,
        ownerId: true,
        owner: { select: { ownerCode: true, ownerName: true } },
      },
    });

    const approvedRevenue = debitNotes
      .filter((dn) => dn.status === 'APPROVED' || dn.status === 'LOCKED')
      .reduce((sum, dn) => sum + Number(dn.grandTotal || 0), 0);

    const pendingRevenue = debitNotes
      .filter((dn) => dn.status === 'DRAFT' || dn.status === 'REVIEWED')
      .reduce((sum, dn) => sum + Number(dn.grandTotal || 0), 0);

    const outstandingDNs = debitNotes.filter(
      (dn) => dn.status === 'APPROVED' || dn.status === 'REVIEWED',
    ).length;

    // Group by owner
    const byOwnerMap = new Map<string, { ownerCode: string; ownerName: string; revenue: number; draftDNs: number; approvedDNs: number; events: number }>();
    
    for (const dn of debitNotes) {
      const key = dn.ownerId;
      if (!byOwnerMap.has(key)) {
        byOwnerMap.set(key, {
          ownerCode: dn.owner.ownerCode,
          ownerName: dn.owner.ownerName,
          revenue: 0,
          draftDNs: 0,
          approvedDNs: 0,
          events: 0,
        });
      }
      const entry = byOwnerMap.get(key)!;
      entry.revenue += Number(dn.grandTotal || 0);
      if (dn.status === 'DRAFT' || dn.status === 'REVIEWED') entry.draftDNs++;
      if (dn.status === 'APPROVED' || dn.status === 'LOCKED') entry.approvedDNs++;
      entry.events++;
    }

    const byOwner = Array.from(byOwnerMap.entries()).map(([ownerId, data]) => ({
      ownerId,
      ...data,
    }));

    // Service type breakdown (mock for now)
    const byServiceType = [
      { serviceType: 'STORAGE', label: 'Phí lưu kho', amount: Math.round(approvedRevenue * 0.6), pct: 60 },
      { serviceType: 'HANDLING', label: 'Phí xếp dỡ', amount: Math.round(approvedRevenue * 0.25), pct: 25 },
      { serviceType: 'VAS', label: 'Dịch vụ gia tăng', amount: Math.round(approvedRevenue * 0.15), pct: 15 },
    ];

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      summary: {
        totalRevenue: approvedRevenue + pendingRevenue,
        approvedRevenue,
        pendingRevenue,
        outstandingDNs,
        periodFrom: firstDayOfMonth.toISOString().split('T')[0],
        periodTo: today.toISOString().split('T')[0],
      },
      byOwner,
      byServiceType,
    };
  }
}
