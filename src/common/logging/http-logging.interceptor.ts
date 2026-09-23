import { HttpException, Inject, Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, tap, throwError, type Observable } from 'rxjs';

import { StructuredLogger } from './structured-logger.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.info('http.request.completed', {
          durationMs: Date.now() - startedAt,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
        });
      }),
      catchError((error: unknown) => {
        this.logger.warn('http.request.failed', {
          durationMs: Date.now() - startedAt,
          method: request.method,
          path: request.path,
          statusCode: this.getStatusCode(error),
        });

        return throwError(() => error);
      }),
    );
  }

  private getStatusCode(error: unknown): number {
    return error instanceof HttpException ? error.getStatus() : 500;
  }
}
