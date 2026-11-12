const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Computes a deterministic, unique 6-character counter code (e.g. "PRX-7K4M9Q")
 * from any shop's UUID so local customers and QR codes match across portals.
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

export function getDefaultCustomerAppUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_CUSTOMER_APP_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (typeof window === 'undefined') return 'https://prinrox.app';

  try {
    const saved = window.localStorage.getItem('prinrox_customer_app_url');
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore storage read issues
  }

  const { protocol, hostname, port, origin } = window.location;
  if (port === '5174') {
    return `${protocol}//${hostname}:5173`;
  }
  if (hostname.startsWith('shops.')) {
    return `${protocol}//${hostname.slice('shops.'.length)}${port ? `:${port}` : ''}`;
  }
  return origin.replace(/\/+$/, '');
}

export function buildShopQrDeepLink(shopId: string, customerBaseUrl?: string): string {
  const base = (customerBaseUrl || getDefaultCustomerAppUrl()).trim().replace(/\/+$/, '');
  const code = getShopUniqueCode(shopId);
  return `${base}/?shop=${encodeURIComponent(code)}&sid=${encodeURIComponent(shopId)}`;
}

