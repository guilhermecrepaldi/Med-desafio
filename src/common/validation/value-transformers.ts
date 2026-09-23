import type { TransformFnParams } from 'class-transformer';

export function normalizeExternalIdentifier({ value }: TransformFnParams): unknown {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return value;
}

export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
