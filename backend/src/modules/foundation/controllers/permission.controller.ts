import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { ListPermissionsQueryDto } from '../dto';
import { PermissionService } from '../services/permission.service';

@Controller('foundation')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('permissions')
  @Permission('foundation.permissions.view')
  listPermissions(@Query() query: ListPermissionsQueryDto) {
    return this.permissionService.list(query);
  }

  @Get('me/permissions')
  @Permission('foundation.permissions.me.view')
  getMyPermissions(@CurrentUser() user: RequestUser) {
    return this.permissionService.getMyPermissions(user.id);
  }
}
