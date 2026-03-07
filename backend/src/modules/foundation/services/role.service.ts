import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission, RolePermissionEffect } from '@prisma/client';
import { LogService } from './log.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { RoleRepository } from '../repositories/role.repository';
import { AuthorizationService } from './authorization.service';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly logService: LogService,
  ) {}

  list(filters: { isActive?: boolean; roleCode?: string }) {
    return this.roleRepository.list(filters);
  }

  async create(data: {
    roleCode: string;
    roleName: string;
    description?: string;
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.roleRepository.findByCode(data.roleCode);
    if (existing) {
      throw new ConflictException(`Role code ${data.roleCode} đã tồn tại.`);
    }

    const role = await this.roleRepository.create(data);
    await this.logService.createAuditLog({
      entityType: 'ROLE',
      entityId: role.id,
      action: 'CREATE_ROLE',
      newValue: role,
      userId: data.actorUserId,
      userRole: data.actorRole,
      requestId: data.requestId,
      sourceModule: 'FOUNDATION',
    });
    return role;
  }

  async update(
    roleId: string,
    data: {
      roleName?: string;
      description?: string;
      isActive?: boolean;
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    const existing = await this.roleRepository.findById(roleId);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy role với id ${roleId}.`);
    }

    const updated = await this.roleRepository.update(roleId, data);
    await this.logService.createAuditLog({
      entityType: 'ROLE',
      entityId: roleId,
      action: 'UPDATE_ROLE',
      oldValue: existing,
      newValue: updated,
      userId: data.actorUserId,
      userRole: data.actorRole,
      requestId: data.requestId,
      sourceModule: 'FOUNDATION',
    });
    return updated;
  }

  async assignPermissions(
    roleId: string,
    changes: Array<{ permissionCode: string; effect?: 'ALLOW' | 'DENY' }>,
    actor: {
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Không tìm thấy role với id ${roleId}.`);
    }

    const permissions = await this.permissionRepository.findByCodes(
      changes.map((item) => item.permissionCode),
    );
    if (permissions.length !== changes.length) {
      const foundCodes = new Set(
        permissions.map((item: Permission) => item.permissionCode),
      );
      const missing = changes
        .map((item) => item.permissionCode)
        .filter((code) => !foundCodes.has(code));
      throw new NotFoundException(`Không tìm thấy permission: ${missing.join(', ')}.`);
    }

    const permissionLinks = permissions.map((permission: Permission) => {
      const incoming = changes.find(
        (item) => item.permissionCode === permission.permissionCode,
      );
      return {
        permissionId: permission.id,
        effect: (incoming?.effect ?? 'ALLOW') as RolePermissionEffect,
      };
    });

    const updated = await this.roleRepository.assignPermissions(
      roleId,
      permissionLinks,
      actor.actorUserId,
    );

    await this.logService.createAuditLog({
      entityType: 'ROLE_PERMISSION',
      entityId: roleId,
      action: 'ASSIGN_ROLE_PERMISSIONS',
      oldValue: role.permissions,
      newValue: updated?.permissions,
      userId: actor.actorUserId,
      userRole: actor.actorRole,
      requestId: actor.requestId,
      sourceModule: 'FOUNDATION',
    });

    return updated;
  }

  async assignUserRole(
    userId: string,
    data: {
      roleCode: string;
      warehouseCode?: string;
      ownerId?: string | null;
      isPrimary?: boolean;
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    await this.authorizationService.assertUserExists(userId);
    const role = await this.roleRepository.findByCode(data.roleCode);
    if (!role) {
      throw new NotFoundException(`Không tìm thấy role code ${data.roleCode}.`);
    }

    const assignment = await this.roleRepository.assignRoleToUser({
      userId,
      roleId: role.id,
      warehouseCode: data.warehouseCode,
      ownerId: data.ownerId,
      isPrimary: data.isPrimary,
      actorUserId: data.actorUserId,
    });

    await this.logService.createAuditLog({
      entityType: 'USER_ROLE',
      entityId: assignment.id,
      action: 'ASSIGN_USER_ROLE',
      newValue: assignment,
      userId: data.actorUserId,
      userRole: data.actorRole,
      requestId: data.requestId,
      sourceModule: 'FOUNDATION',
      warehouseCode: data.warehouseCode,
      ownerId: data.ownerId ?? undefined,
    });

    return assignment;
  }
}
