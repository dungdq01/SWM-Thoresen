import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../interfaces/request-user.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user?.[data] : user;
  },
);
