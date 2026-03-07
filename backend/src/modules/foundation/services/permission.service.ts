import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  list(filters: { moduleCode?: string; resourceCode?: string }) {
    return this.permissionRepository.list(filters);
  }

  async getMyPermissions(userId: string) {
    return this.permissionRepository.getEffectivePermissionsByUserId(userId);
  }
}
