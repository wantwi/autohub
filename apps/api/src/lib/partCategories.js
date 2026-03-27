/**
 * Canonical part categories for listings and search filters (single source of truth for API + clients).
 */
export const PART_CATEGORIES = [
  'Engine Parts',
  'Transmission & Drivetrain Parts',
  'Brake System Parts',
  'Suspension & Steering Parts',
  'Electrical & Electronic Parts',
  'Cooling System Parts',
  'Fuel System Parts',
  'Air & Exhaust System Parts',
  'Body & Interior Parts',
  'Maintenance & Wear Parts',
];

/** @param {string} value */
export function isPartCategory(value) {
  return typeof value === 'string' && PART_CATEGORIES.includes(value);
}
