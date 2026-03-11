/**
 * VAS Module - Authentication & Authorization Guards
 * Re-exports from common to integrate with M1 Foundation auth system
 */

// Re-export guards from common to ensure single source of truth
export { AuthGuard as VasAuthGuard } from '../../../common/guards/auth.guard';
export { PermissionGuard as VasPermissionGuard } from '../../../common/guards/permission.guard';
export { Permission, PERMISSION_KEY } from '../../../common/decorators/permission.decorator';
export { CurrentUser } from '../../../common/decorators/current-user.decorator';

// Re-export RequestUser as UserContext for backward compatibility
export type { RequestUser as UserContext } from '../../../common/interfaces/request-user.interface';
