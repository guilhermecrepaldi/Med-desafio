import { Catch, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { REQUEST_ID_HEADER } from '../request-context/request-id.middleware';
import { RequestContextService } from '../request-context/request-context.service';
import { StructuredLogger } from '../logging/structured-logger.service';

interface ErrorBody {
  error: string;
  errorCode: string;
  message: string | string[];
  path: string;
  requestId: string;
  statusCode: number;
  timestamp: string;
}

interface ErrorDescription {
  error: string;
  errorCode: string;
  message: string | string[];
  statusCode: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
    @Inject(RequestContextService)
    private readonly requestContext: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const description = this.describe(exception);
    const requestId = this.getRequestId(response);

    this.logger.error('http.request.error', exception, {
      method: request.method,
      path: request.path,
      statusCode: description.statusCode,
    });

    if (response.headersSent) {
      return;
    }

    const body: ErrorBody = {
      statusCode: description.statusCode,
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId,
      message: description.message,
      error: description.error,
      errorCode: description.errorCode,
    };

    response.status(description.statusCode).json(body);
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof HttpException) {
      return this.describeHttpException(exception);
    }

    if (this.isUniqueConstraintViolation(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Já existe um registro com os identificadores informados.',
        error: 'Conflict',
        errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    };
  }

  private describeHttpException(exception: HttpException): ErrorDescription {
    const response = exception.getResponse();
    const statusCode = exception.getStatus();
    const fallbackMessage = exception.message || 'Não foi possível processar a requisição.';

    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
        error: this.errorLabel(statusCode),
        errorCode: this.errorCode(statusCode),
      };
    }

    const error = isRecord(response) ? response : {};
    const message = this.messageFrom(error.message, fallbackMessage);

    return {
      statusCode,
      message,
      error: typeof error.error === 'string' ? error.error : this.errorLabel(statusCode),
      errorCode: this.errorCode(statusCode),
    };
  }

  private isUniqueConstraintViolation(exception: unknown): boolean {
    if (!(exception instanceof QueryFailedError)) {
      return false;
    }

    const driverError = exception.driverError as unknown;

    return isRecord(driverError) && driverError.code === '23505';
  }

  private messageFrom(value: unknown, fallback: string): string | string[] {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    if (Array.isArray(value)) {
      const messages = value.filter((item): item is string => typeof item === 'string');

      if (messages.length > 0) {
        return messages;
      }
    }

    return fallback;
  }

  private getRequestId(response: Response): string {
    const requestId = this.requestContext.getRequestId();

    if (requestId !== undefined) {
      return requestId;
    }

    const responseRequestId = response.getHeader(REQUEST_ID_HEADER);

    if (typeof responseRequestId === 'string') {
      return responseRequestId;
    }

    return 'not-available';
  }

  private errorLabel(statusCode: number): string {
    return HttpStatus[statusCode] ?? 'Error';
  }

  private errorCode(statusCode: number): string {
    return `HTTP_${statusCode}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
