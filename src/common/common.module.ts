import { Global, Module } from '@nestjs/common';

import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { HttpLoggingInterceptor } from './logging/http-logging.interceptor';
import { StructuredLogger } from './logging/structured-logger.service';
import { RequestContextService } from './request-context/request-context.service';
import { RequestIdMiddleware } from './request-context/request-id.middleware';

@Global()
@Module({
  providers: [
    GlobalExceptionFilter,
    HttpLoggingInterceptor,
    RequestContextService,
    RequestIdMiddleware,
    StructuredLogger,
  ],
  exports: [
    GlobalExceptionFilter,
    HttpLoggingInterceptor,
    RequestContextService,
    RequestIdMiddleware,
    StructuredLogger,
  ],
})
export class CommonModule {}
