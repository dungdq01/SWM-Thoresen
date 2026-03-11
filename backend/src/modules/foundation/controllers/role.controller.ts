import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import {
  AssignRolePermissionsDto,
  AssignUserRoleDto,
  CreateRoleDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { RoleService } from '../services/role.service';

@Controller('foundation')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Get('roles')
  @Permission('foundation.roles.view')
  listRoles(@Query() query: ListRolesQueryDto) {
    return this.roleService.list(query);
  }

  @Post('roles')
  @Permission('foundation.roles.create')
  createRole(
    @Body() body: CreateRoleDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'create_role',
      sourceModule: 'FOUNDATION',
      payload: body,
      correlationId: request.requestId,
      execute: () =>
        this.roleService.create({
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseCode: 201,
        responseBody: result,
        resourceType: 'ROLE',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  @Put('roles/:id')
  @Permission('foundation.roles.update')
  updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'update_role',
      sourceModule: 'FOUNDATION',
      payload: { id, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.roleService.update(id, {
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'ROLE',
        resourceId: id,
      }),
    });
  }

  @Post('roles/:id/permissions')
  @Permission('foundation.roles.assign_permission')
  assignPermissions(
    @Param('id') id: string,
    @Body() body: AssignRolePermissionsDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'assign_role_permissions',
      sourceModule: 'FOUNDATION',
      payload: { id, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.roleService.assignPermissions(id, body.changes, {
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'ROLE',
        resourceId: id,
      }),
    });
  }

  @Delete('roles/:id')
  @Permission('foundation.roles.delete')
  deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.roleService.delete(id, {
      actorUserId: user.id,
      actorRole: user.roleCodes[0],
      requestId: request.requestId,
    });
  }

  @Post('users/:userId/roles')
  @Permission('foundation.users.assign_role')
  assignUserRole(
    @Param('userId') userId: string,
    @Body() body: AssignUserRoleDto,
    @CurrentUser() user: RequestUser,
    @Req() request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
  ) {
    return this.idempotencyService.executeIfKeyProvided({
      idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
      commandName: 'assign_user_role',
      sourceModule: 'FOUNDATION',
      payload: { userId, ...body },
      correlationId: request.requestId,
      execute: () =>
        this.roleService.assignUserRole(userId, {
          ...body,
          actorUserId: user.id,
          actorRole: user.roleCodes[0],
          requestId: request.requestId,
        }),
      mapSuccess: (result) => ({
        responseBody: result,
        resourceType: 'USER_ROLE',
        resourceId: (result as { id: string }).id,
      }),
    });
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
