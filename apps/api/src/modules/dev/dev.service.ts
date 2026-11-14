import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Developer conveniences. Everything here is disabled outside development.
 *
 * `seedDemoData` shells out to `prisma/seed-demo-business.mjs` instead of re-implementing the
 * catalogue in TypeScript: that script already owns the per-business-type profiles, the 30 days
 * of backdated trading history and the stock/balance bookkeeping, and running it as a child
 * process keeps it usable from the CLI (`node prisma/seed-demo-business.mjs --business-id …`)
 * for the same result.
 */
@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  get enabled() {
    return process.env.NODE_ENV !== 'production';
  }

  seedDemoData(businessId: string): Promise<Record<string, unknown>> {
    const script = resolve(process.cwd(), 'prisma', 'seed-demo-business.mjs');
    const args = [script, '--business-id', businessId, '--reset'];

    this.logger.log(`Seeding demo data for business ${businessId}`);

    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      // A 30-day seed takes a few seconds; anything near this cap means the child is stuck.
      const timer = setTimeout(() => {
        child.kill();
        rejectPromise(new BadRequestException('Seeding timed out — check the API log'));
      }, 180_000);

      child.stdout.on('data', (chunk) => { stdout += String(chunk); });
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });

      child.on('error', (error) => {
        clearTimeout(timer);
        rejectPromise(new BadRequestException(`Could not start the seeder: ${error.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        // The script prints human-readable progress, then one final JSON line with the result.
        const lastLine = stdout.trim().split('\n').filter(Boolean).pop();
        if (lastLine?.startsWith('{')) {
          try {
            const parsed = JSON.parse(lastLine) as Record<string, unknown>;
            if (parsed['ok'] === false) {
              rejectPromise(new BadRequestException(String(parsed['reason'] ?? 'Seeding was skipped')));
            } else {
              resolvePromise(parsed);
            }
            return;
          } catch { /* fall through to the generic error below */ }
        }
        this.logger.error(`Seeder exited with ${code}: ${stderr.slice(-2000)}`);
        rejectPromise(new BadRequestException(
          code === 0 ? 'Seeder finished without a result' : (stderr.trim().split('\n').pop() || `Seeder exited with ${code}`),
        ));
      });
    });
  }
}