/**
 * Runtime/desktop-shell bridge.
 *
 * Calls the native `app_info` Tauri command when running inside the desktop shell.
 * Falls back to browser-derived values so the exact same frontend still runs in a
 * plain `vite` preview during development and testing.
 */
import { APP_VERSION } from '@/lib/config';

export interface RuntimeInfo {
  platform: string;
  appVersion: string;
  inDesktopShell: boolean;
}

interface NativeAppInfo {
  platform: string;
  version: string;
}

export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function browserPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.platform || 'web';
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  if (isDesktopShell()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<NativeAppInfo>('app_info');
      return { platform: info.platform, appVersion: info.version, inDesktopShell: true };
    } catch {
      // Fall through to the browser fallback below.
    }
  }
  return { platform: browserPlatform(), appVersion: APP_VERSION, inDesktopShell: false };
}
