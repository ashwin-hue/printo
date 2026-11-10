/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NHOST_SUBDOMAIN?: string;
  readonly VITE_NHOST_REGION?: string;
  readonly VITE_NHOST_AUTH_URL?: string;
  readonly VITE_NHOST_GRAPHQL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
