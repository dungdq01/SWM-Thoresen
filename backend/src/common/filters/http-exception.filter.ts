import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BillingError } from '../../modules/billing/domain/billing.errors';

type FilterRequest = {
  requestId?: string;
  url: string;
};

type FilterResponse = {
  status: (statusCode: number) => FilterResponse;
  json: (body: unknown) => void;
};

function extractStatusFromErrorCode(code: string): number {
  const match = code.match(/-(\d{3})$/);
  if (match) {
    const statusCode = parseInt(match[1], 10);
    if (statusCode >= 200 && statusCode < 600) {
      return statusCode;
    }
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<FilterResponse>();
    const request = context.getRequest<FilterRequest>();

    const isHttpException = exception instanceof HttpException;
    const isBillingError = exception instanceof BillingError;

    if (!isHttpException && !isBillingError) {
      console.error('[UnhandledException]', exception);
    }

    let status: number;
    let rawResponse: unknown;

    if (isHttpException) {
      status = exception.getStatus();
      rawResponse = exception.getResponse();
    } else if (isBillingError) {
      status = extractStatusFromErrorCode(exception.code);
      rawResponse = {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      rawResponse = null;
    }

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
