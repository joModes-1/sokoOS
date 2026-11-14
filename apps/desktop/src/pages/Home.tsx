import { useEffect, useState } from 'react';
import { useConnectivity } from '@/hooks/use-connectivity';
import { getRuntimeInfo, type RuntimeInfo } from '@/lib/runtime';
import { API_BASE_URL, API_PREFIX, APP_NAME } from '@/lib/config';
import { formatDateTime } from '@/lib/format';

export function Home() {
  const { isChecking, isOnline, health, error, lastCheckedAt, refetch } = useConnectivity();
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getRuntimeInfo().then((info) => {
      if (!cancelled) setRuntime(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Welcome to SokoOS Desktop</h1>
        <p className="page-subtitle">
          A desktop client for the existing SokoOS platform. Nothing here replaces the website, the
          mobile app, the backend or the database.
        </p>
      </div>

      <div className="notice notice-info">
        <span aria-hidden>ℹ️</span>
        <div>
          <strong>Additive desktop shell.</strong> This build proves the app launches and can reach the
          existing SokoOS API online. Sign-in, local storage and sync arrive in later phases, so no
          business data is shown or stored yet.
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="section-title">Backend connectivity</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refetch}
            disabled={isChecking}
          >
            {isChecking ? 'Checking…' : 'Check connection'}
          </button>
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Status</dt>
            <dd>
              {isChecking && !health ? (
                'Checking…'
              ) : isOnline ? (
                <span className="badge badge-success">Online</span>
              ) : (
                <span className="badge badge-danger">Offline</span>
              )}
            </dd>
            <dt>API base URL</dt>
            <dd>
              {API_BASE_URL}
              {API_PREFIX}
            </dd>
            <dt>Health endpoint</dt>
            <dd>
              {API_PREFIX}
              /health
            </dd>
            <dt>Server version</dt>
            <dd>{health?.version ?? '—'}</dd>
            <dt>Server time</dt>
            <dd>{health?.timestamp ? formatDateTime(health.timestamp) : '—'}</dd>
            <dt>Last checked</dt>
            <dd>{lastCheckedAt ? formatDateTime(new Date(lastCheckedAt)) : '—'}</dd>
            {error ? (
              <>
                <dt>Error</dt>
                <dd>{error}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="section-title">Desktop runtime</span>
        </div>
        <div className="card-body">
          <dl className="kv">
            <dt>Application</dt>
            <dd>{APP_NAME}</dd>
            <dt>App version</dt>
            <dd>{runtime?.appVersion ?? '—'}</dd>
            <dt>Platform</dt>
            <dd>{runtime?.platform ?? '—'}</dd>
            <dt>Shell</dt>
            <dd>
              {runtime
                ? runtime.inDesktopShell
                  ? 'Tauri desktop shell'
                  : 'Browser preview (vite)'
                : '—'}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
