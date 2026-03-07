import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ requestId?: string }>();

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.requestId ?? null,
        },
      })),
    );
  }
}
