import { createClient } from '@nhost/nhost-js';

const env = (import.meta as any).env || {};
const subdomain = env.VITE_NHOST_SUBDOMAIN || 'qcmgjupxqsuyseegsyqu';
const region = env.VITE_NHOST_REGION || 'ap-south-1';
const authUrl = env.VITE_NHOST_AUTH_URL || '';

export const isNhostConfigured = Boolean(
  (subdomain && region && !subdomain.includes('placeholder')) ||
  authUrl
);

export const nhost = createClient(
  authUrl
    ? { authUrl }
    : { subdomain, region }
);
