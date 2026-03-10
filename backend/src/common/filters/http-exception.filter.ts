import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type FilterRequest = {
  requestId?: string;
  url: string;
};

type FilterResponse = {
  status: (statusCode: number) => FilterResponse;
  json: (body: unknown) => void;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<FilterResponse>();
    const request = context.getRequest<FilterRequest>();

    const isHttpException = exception instanceof HttpException;
    if (!isHttpException) {
      console.error('[UnhandledException]', exception);
    }
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse = isHttpException ? exception.getResponse() : null;

    const errorPayload =
      typeof rawResponse === 'object' && rawResponse !== null
        ? rawResponse
        : { message: isHttpException ? rawResponse : 'Internal server error' };

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        ...(typeof errorPayload === 'object' && errorPayload !== null
          ? errorPayload
          : { message: String(errorPayload) }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.requestId ?? null,
      },
    });
  }
}
