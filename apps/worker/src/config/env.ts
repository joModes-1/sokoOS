/**
 * Loads environment variables for the worker.
 * The worker is not a NestJS app, so it reads the repo-root `.env` itself.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  process.env['ENV_FILE'],
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
].filter((candidate): candidate is string => Boolean(candidate));

for (const candidate of candidates) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}
