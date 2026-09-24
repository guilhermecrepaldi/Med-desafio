import type { HeadersObject } from '@nestjs/swagger';

import type { ErrorResponseDto } from './dto';

export const REQUEST_ID_EXAMPLE = 'auditoria-pedido-616';

export const REQUEST_ID_SCHEMA = {
  type: 'string' as const,
  maxLength: 128,
  pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
  example: REQUEST_ID_EXAMPLE,
};

export const REQUEST_ID_RESPONSE_HEADERS: HeadersObject = {
  'x-request-id': {
    description: 'Identificador da requisição reutilizado ou gerado pela API para rastreamento.',
    schema: REQUEST_ID_SCHEMA,
  },
};

export function errorResponseExample(
  statusCode: number,
  path: string,
  message: string | string[],
): ErrorResponseDto {
  const errorLabels: Record<number, string> = {
    400: 'Bad Request',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };

  return {
    statusCode,
    timestamp: '2026-09-24T12:00:00.000Z',
    path,
    requestId: REQUEST_ID_EXAMPLE,
    message,
    error: errorLabels[statusCode] ?? 'Error',
    errorCode: `HTTP_${statusCode}`,
  };
}
