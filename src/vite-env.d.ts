/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZHIPU_API_KEY: string
  readonly VITE_ZHIPU_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}