import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import {
  ListUsersQueryDto,
  CreateUserDto,
  UpdateUserDto,
  ResetUserPasswordDto,
} from '../dto';
import { UserService } from '../services/user.service';

@Controller('foundation')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  @Permission('foundation.users.view')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.userService.list(query);
  }

  @Get('users/:id')
  @Permission('foundation.users.view')
  getUser(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Post('users')
  @Permission('foundation.users.create')
  createUser(
    @Body() body: CreateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.create(body, user.id);
  }

  @Put('users/:id')
  @Permission('foundation.users.update')
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.update(id, body, user.id);
  }

  @Post('users/:id/reset-password')
  @Permission('foundation.users.reset_password')
  resetPassword(
    @Param('id') id: string,
    @Body() body: ResetUserPasswordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.resetPassword(id, body, user.id);
  }

  @Post('users/:id/toggle-active')
  @Permission('foundation.users.update')
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.toggleActive(id, user.id);
  }
}
