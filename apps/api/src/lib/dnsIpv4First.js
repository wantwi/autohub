/**
 * Prefer IPv4 when resolving DB hostnames. Fixes common case: TCP probe hits IPv4,
 * but pg tried AAAA first and hung (broken/slow IPv6) → "Connection terminated due to connection timeout".
 */
import dns from 'dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
