import type { Shop } from '../types/database';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Computes a deterministic, unique 6-character counter code (e.g. "PRX-7K4M9Q")
 * from any shop's UUID so local walk-in customers and QR codes match across portals.
 */
export function getShopUniqueCode(shopId?: string | null): string {
  if (!shopId) return 'PRX-000000';
  let h1 = 2166136261;
  let h2 = 3359036143;
  for (let i = 0; i < shopId.length; i++) {
    const ch = shopId.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 ^= ch + ((i + 1) * 131);
    h2 = Math.imul(h2, 16777619);
  }

  let chars = '';
  let v1 = h1 >>> 0;
  let v2 = h2 >>> 0;
  for (let i = 0; i < 6; i++) {
    const idx = i < 3 ? (v1 >> (i * 5)) & 31 : (v2 >> ((i - 3) * 5)) & 31;
    chars += CODE_ALPHABET[idx];
  }
  return `PRX-${chars}`;
}

/**
 * Extracts a shop UUID or PRX-XXXXXX code from any scanned QR URL or manually entered code.
 */
export function parseShopQrPayload(rawValue: string): { shopId: string | null; code: string | null } {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return { shopId: null, code: null };

  // 1. Check URL query parameters (?sid=...&shop=PRX-XXXXXX)
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('?')) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://prinrox.local/${trimmed.replace(/^\/+/, '')}`;
      const url = new URL(normalizedUrl);
      const sid = url.searchParams.get('sid') || url.searchParams.get('shopId');
      const shopCode = url.searchParams.get('shop') || url.searchParams.get('code');
      if (sid || shopCode) {
        return {
          shopId: sid?.trim() || null,
          code: shopCode ? normalizeShopCode(shopCode) : null,
        };
      }
    } catch {
      // Fall through to plain pattern extraction
    }
  }

  // 2. Check prinrox:// deep link or PRX-XXXXXX text
  const prxMatch = trimmed.toUpperCase().match(/PRX-[A-Z2-9]{6}/);
  if (prxMatch) {
    return { shopId: null, code: prxMatch[0] };
  }

  // 3. Check UUID pattern
  const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) {
    return { shopId: uuidMatch[0], code: null };
  }

  // 4. Bare 6-character code without PRX- prefix
  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (/^[A-Z2-9]{6}$/.test(upper)) {
    return { shopId: null, code: `PRX-${upper}` };
  }

  return { shopId: null, code: normalizeShopCode(trimmed) };
}

export function normalizeShopCode(input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (clean.startsWith('PRX-')) return clean;
  if (/^[A-Z2-9]{6}$/.test(clean)) return `PRX-${clean}`;
  return clean;
}

export function findShopByQrPayload(shops: Shop[], rawValue: string): Shop | null {
  if (!shops.length || !rawValue.trim()) return null;
  const { shopId, code } = parseShopQrPayload(rawValue);

  if (shopId) {
    const byId = shops.find((s) => s.id.toLowerCase() === shopId.toLowerCase());
    if (byId) return byId;
  }

  if (code) {
    const byCode = shops.find((s) => getShopUniqueCode(s.id) === code);
    if (byCode) return byCode;
  }

  const normalizedBucket = rawValue.trim().toLowerCase();
  return shops.find((s) => s.bucket_id?.toLowerCase() === normalizedBucket) || null;
}

