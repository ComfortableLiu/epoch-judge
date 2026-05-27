import { NotFoundException } from '@nestjs/common';

export function parseEntityNumber(raw: string, label = 'Resource'): number {
  const number = Number.parseInt(raw, 10);
  if (!Number.isFinite(number) || number < 1) {
    throw new NotFoundException(`${label} not found`);
  }
  return number;
}
