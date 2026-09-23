import { BadRequestException } from '@nestjs/common';

export function normalizeRouteIdentifier(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > 100) {
    throw new BadRequestException(
      `${fieldName} deve ser um identificador não vazio de até 100 caracteres.`,
    );
  }

  return normalized;
}
