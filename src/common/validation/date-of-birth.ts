import { BadRequestException } from '@nestjs/common';

export function parseCompactDate(value: string): string {
  if (!/^\d{8}$/.test(value)) {
    throw new BadRequestException('DataNascimento deve usar o formato YYYYMMDD.');
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('DataNascimento deve representar uma data válida.');
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function formatCompactDate(value: string): string {
  return value.replaceAll('-', '');
}
