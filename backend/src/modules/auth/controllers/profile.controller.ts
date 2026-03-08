import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SessionService } from '../services/session.service';
import { SecurityAuditService } from '../services/security-audit.service';
import { SelectWarehouseDto } from '../dto/select-warehouse.dto';
import { TokenService } from '../services/token.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { UserProfile, PermissionSnapshot } from '../interfaces/security-context.interface';

@Controller('api/v1/auth')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('me')
  async getProfile(@Req() req: Request): Promise<UserProfile> {
    const user = (req as any).user;

    const dbUser = await this.prisma.appUser.findUnique({
      where: { id: user.userId },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: { select: { roleCode: true, roleName: true } },
          },
        },
        credential: { select: { mustChangePassword: true } },
      },
    });

    if (!dbUser) {
      throw new BadRequestException('User không tồn tại');
    }

    const roleCodes = dbUser.userRoles.map((ur) => ur.role.roleCode);
    const warehouseCodes = dbUser.userRoles
      .filter((ur) => ur.warehouseCode)
      .map((ur) => ur.warehouseCode!);
    const ownerIds = dbUser.userRoles
      .filter((ur) => ur.ownerId)
      .map((ur) => ur.ownerId!);

    const warehouseOptions = await this.getWarehouseOptions(warehouseCodes);

    return {
      id: dbUser.id,
      userCode: dbUser.userCode,
      username: dbUser.username,
      fullName: dbUser.fullName,
      email: dbUser.email,
      roleCodes,
      selectedWarehouseId: user.selectedWarehouseId ?? null,
      warehouseOptions,
      ownerScope: ownerIds,
      channel: user.channel,
      mustChangePassword: dbUser.credential?.mustChangePassword ?? false,
    };
  }

  @Get('me/permissions')
  async getPermissions(@Req() req: Request): Promise<PermissionSnapshot> {
    const user = (req as any).user;

    const dbUser = await this.prisma.appUser.findUnique({
      where: { id: user.userId },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { effect: 'ALLOW' },
                  include: {
                    permission: { select: { permissionCode: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return { roleCodes: [], permissions: [], warehouseScope: [], ownerScope: [] };
    }

    const roleCodes = dbUser.userRoles.map((ur) => ur.role.roleCode);
    const permissions = new Set<string>();
    dbUser.userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissions.add(rp.permission.permissionCode);
      });
    });

    const warehouseCodes = dbUser.userRoles
      .filter((ur) => ur.warehouseCode)
      .map((ur) => ur.warehouseCode!);
    const ownerIds = dbUser.userRoles
      .filter((ur) => ur.ownerId)
      .map((ur) => ur.ownerId!);

    return {
      roleCodes,
      permissions: Array.from(permissions),
      warehouseScope: warehouseCodes,
      ownerScope: ownerIds,
    };
  }

  @Post('select-warehouse')
  @HttpCode(HttpStatus.OK)
  async selectWarehouse(
    @Body() dto: SelectWarehouseDto,
    @Req() req: Request,
  ): Promise<{ selectedWarehouseId: string; accessToken: string }> {
    const user = (req as any).user;
    const correlationId = (req as any).requestId;

    const warehouse = await this.prisma.mdWarehouse.findUnique({
      where: { id: dto.warehouseId },
      select: { id: true, warehouseCode: true, isActive: true },
    });

    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException({
        code: 'AUTH_WAREHOUSE_CONTEXT_INVALID',
        message: 'Kho không tồn tại hoặc không hoạt động',
      });
    }

    const dbUser = await this.prisma.appUser.findUnique({
      where: { id: user.userId },
      include: {
        userRoles: {
          where: { isActive: true },
          select: { warehouseCode: true },
        },
      },
    });

    const assignedWarehouses = dbUser?.userRoles
      .filter((ur) => ur.warehouseCode)
      .map((ur) => ur.warehouseCode) ?? [];

    if (assignedWarehouses.length > 0 && !assignedWarehouses.includes(warehouse.warehouseCode)) {
      throw new BadRequestException({
        code: 'AUTH_WAREHOUSE_CONTEXT_INVALID',
        message: 'Bạn không có quyền truy cập kho này',
      });
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: user.sessionId },
      select: { selectedWarehouseId: true },
    });

    await this.sessionService.updateSelectedWarehouse(user.sessionId, dto.warehouseId);

    await this.securityAuditService.logWarehouseContextSwitch(
      user.userId,
      user.sessionId,
      session?.selectedWarehouseId ?? null,
      dto.warehouseId,
      correlationId,
    );

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.userId,
      userCode: user.userCode,
      username: user.username,
      sessionId: user.sessionId,
      channel: user.channel,
      authVersion: Number(user.authVersion),
      selectedWarehouseId: dto.warehouseId,
    });

    return {
      selectedWarehouseId: dto.warehouseId,
      accessToken,
    };
  }

  private async getWarehouseOptions(
    warehouseCodes: string[],
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    if (warehouseCodes.length === 0) {
      const allWarehouses = await this.prisma.mdWarehouse.findMany({
        where: { isActive: true },
        select: { id: true, warehouseCode: true, warehouseName: true },
      });
      return allWarehouses.map((w) => ({
        id: w.id,
        code: w.warehouseCode,
        name: w.warehouseName,
      }));
    }

    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: {
        warehouseCode: { in: warehouseCodes },
        isActive: true,
      },
      select: { id: true, warehouseCode: true, warehouseName: true },
    });

    return warehouses.map((w) => ({
      id: w.id,
      code: w.warehouseCode,
      name: w.warehouseName,
    }));
  }
}
