/**
 * SokoOS Desktop configuration.
 *
 * The backend base URL mirrors how apps/web resolves NEXT_PUBLIC_API_URL so the
 * desktop app points at the same platform by default (NestJS/Fastify, prefix /v1).
 */

const DEFAULT_API_URL = 'http://localhost:3001';

export const APP_NAME = 'SokoOS Desktop';
export const APP_VERSION = '0.0.1';

/** REST version prefix used by the existing backend (see apps/api/src/main.ts). */
export const API_PREFIX = '/v1';

/** Normalised backend base URL with no trailing slash. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
