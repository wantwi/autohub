import { randomBytes } from 'crypto';

export function generateOrderReference() {
  const hex = randomBytes(4).toString('hex').toUpperCase();
  return `AH-${hex}`;
}
