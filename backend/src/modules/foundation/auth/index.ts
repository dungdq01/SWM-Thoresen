// Re-export guards from common to ensure single source of truth
export { AuthGuard } from '../../../common/guards/auth.guard';
export { PermissionGuard } from '../../../common/guards/permission.guard';
export { Permission, PERMISSION_KEY } from '../../../common/decorators/permission.decorator';
export { CurrentUser } from '../../../common/decorators/current-user.decorator';
export { Public } from '../../../common/decorators/public.decorator';

// Keep internal API guard local to foundation
export * from './internal-api.guard';
