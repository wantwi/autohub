import { keysToCamel } from './format.js';

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  return `${String(phone).slice(0, 4)}****${String(phone).slice(-2)}`;
}

/**
 * @param {Record<string, unknown>} orderRow
 * @param {object} opts
 * @param {'buyer'|'dealer'|'admin'} opts.role
 * @param {Record<string, unknown>|null} [opts.buyerRow]
 */
export function formatOrderForViewer(orderRow, opts) {
  const o = keysToCamel(orderRow);
  if (opts.role === 'admin' || opts.role === 'buyer') {
    return o;
  }
  if (opts.role === 'dealer') {
    const st = orderRow.status;
    const paid = orderRow.payment_status === 'paid';
    const reveal = paid && st !== 'pending' && st !== 'cancelled';
    if (!reveal && opts.buyerRow) {
      return {
        ...o,
        buyerPhone: maskPhone(opts.buyerRow.phone),
        buyerFullName: opts.buyerRow.full_name,
      };
    }
    if (opts.buyerRow) {
      return {
        ...o,
        buyerPhone: opts.buyerRow.phone,
        buyerFullName: opts.buyerRow.full_name,
      };
    }
  }
  return o;
}
