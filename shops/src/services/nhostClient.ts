import { createClient } from '@nhost/nhost-js';

const env = (import.meta as any).env || {};
const subdomain = env.VITE_NHOST_SUBDOMAIN || '';
const region = env.VITE_NHOST_REGION || '';
const authUrl = env.VITE_NHOST_AUTH_URL || '';

export const isNhostConfigured = Boolean(
  (subdomain && region && !subdomain.includes('placeholder')) ||
  authUrl
);

export const nhost = createClient(
  isNhostConfigured
    ? authUrl
      ? { authUrl }
      : { subdomain, region }
    : {
        subdomain: 'local',
        region: 'local',
      }
);

