import { Inject, Injectable } from '@nestjs/common';

import { RequestContextService } from '../request-context/request-context.service';

export type LogMetadata = Record<string, unknown>;

type LogLevel = 'error' | 'info' | 'warn';

interface LogEntry {
  event: string;
  level: LogLevel;
  requestId?: string;
  timestamp: string;
  [key: string]: unknown;
}

const REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_VALUE = '[CIRCULAR]';
const MAX_VALUE_DEPTH = 5;
const MAX_STRING_LENGTH = 2_000;
const SENSITIVE_METADATA_KEYS = new Set([
  'authorization',
  'base64',
  'body',
  'cookie',
  'datanascimento',
  'dateofbirth',
  'document',
  'documentcontent',
  'documento',
  'nomepaciente',
  'password',
  'patientname',
  'payload',
  'token',
]);

@Injectable()
export class StructuredLogger {
  constructor(
    @Inject(RequestContextService)
    private readonly requestContext: RequestContextService,
  ) {}

  info(event: string, metadata: LogMetadata = {}): void {
    this.write('info', event, metadata);
  }

  warn(event: string, metadata: LogMetadata = {}): void {
    this.write('warn', event, metadata);
  }

  error(event: string, error: unknown, metadata: LogMetadata = {}): void {
    this.write('error', event, {
      ...metadata,
      error: this.serializeError(error),
    });
  }

  private write(level: LogLevel, event: string, metadata: LogMetadata): void {
    const entry: LogEntry = {
      ...this.sanitizeMetadata(metadata),
      level,
      timestamp: new Date().toISOString(),
      event,
      requestId: this.requestContext.getRequestId(),
    };

    const serializedEntry = JSON.stringify(entry);
    const output = `${serializedEntry}\n`;

    if (level === 'error') {
      process.stderr.write(output);
      return;
    }

    process.stdout.write(output);
  }

  private sanitizeMetadata(metadata: LogMetadata): LogMetadata {
    const seen = new WeakSet<object>();
    const sanitized = this.sanitizeValue(metadata, seen, 0);

    return isRecord(sanitized) ? sanitized : {};
  }

  private sanitizeValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.length > MAX_STRING_LENGTH
        ? `${value.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]`
        : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'symbol' || typeof value === 'function') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (depth >= MAX_VALUE_DEPTH) {
      return '[MAX_DEPTH]';
    }

    if (typeof value === 'object') {
      if (seen.has(value)) {
        return CIRCULAR_VALUE;
      }

      seen.add(value);

      if (Array.isArray(value)) {
        return value.map((item) => this.sanitizeValue(item, seen, depth + 1));
      }

      const sanitizedObject: LogMetadata = {};

      for (const [key, item] of Object.entries(value)) {
        sanitizedObject[key] = this.isSensitiveKey(key)
          ? REDACTED_VALUE
          : this.sanitizeValue(item, seen, depth + 1);
      }

      return sanitizedObject;
    }

    return String(value);
  }

  private serializeError(error: unknown): LogMetadata {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: this.sanitizeErrorText(error.message),
        stack: error.stack === undefined ? undefined : this.sanitizeErrorText(error.stack),
      };
    }

    return {
      value: this.sanitizeValue(error, new WeakSet<object>(), 0),
    };
  }

  private isSensitiveKey(key: string): boolean {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    return SENSITIVE_METADATA_KEYS.has(normalizedKey);
  }

  private sanitizeErrorText(value: string): string {
    const truncatedValue =
      value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]` : value;

    return /(?:base64|documentcontent)/i.test(truncatedValue) ? REDACTED_VALUE : truncatedValue;
  }
}

function isRecord(value: unknown): value is LogMetadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
