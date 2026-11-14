/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the existing SokoOS backend (NestJS/Fastify), e.g. http://localhost:3001 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
