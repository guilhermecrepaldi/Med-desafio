import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware, REQUEST_ID_HEADER } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const requestContext = new RequestContextService();
  const middleware = new RequestIdMiddleware(requestContext);

  it('reutiliza um x-request-id seguro recebido no header', () => {
    const request = {
      get: jest.fn().mockReturnValue('correlation-123'),
    } as unknown as Request;
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn(() => requestContext.getRequestId()) as NextFunction;

    middleware.use(request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'correlation-123');
    expect(next).toHaveReturnedWith('correlation-123');
  });

  it('gera um UUID quando o valor recebido não é seguro para logs', () => {
    const request = {
      get: jest.fn().mockReturnValue('invalid value with spaces'),
    } as unknown as Request;
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(request, response, next);

    const generatedRequestId = (response.setHeader as jest.Mock).mock.calls[0]?.[1];

    expect(generatedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
