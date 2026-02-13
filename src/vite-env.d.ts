/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BSKY_OAUTH_CLIENT_ID?: string;
  readonly VITE_BSKY_OAUTH_REDIRECT_URI?: string;
  readonly VITE_BSKY_OAUTH_DEV_CLIENT_ID?: string;
  readonly VITE_BSKY_OAUTH_DEV_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
