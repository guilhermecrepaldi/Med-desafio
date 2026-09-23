import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from './request-context.service';

export const REQUEST_ID_HEADER = 'x-request-id';

const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(RequestContextService)
    private readonly requestContext: RequestContextService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.resolveRequestId(request.get(REQUEST_ID_HEADER));

    response.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContext.run({ requestId }, next);
  }

  private resolveRequestId(providedRequestId: string | undefined): string {
    const normalizedRequestId = providedRequestId?.trim();

    if (
      normalizedRequestId !== undefined &&
      normalizedRequestId.length > 0 &&
      normalizedRequestId.length <= MAX_REQUEST_ID_LENGTH &&
      SAFE_REQUEST_ID.test(normalizedRequestId)
    ) {
      return normalizedRequestId;
    }

    return randomUUID();
  }
}
