/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL publique de l'API lorsqu'elle est hébergée séparément du frontend. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
