import { StatusPill } from '@/components/StatusPill';
import { useConnectivity } from '@/hooks/use-connectivity';

export function TopBar() {
  const { isChecking, isOnline, refetch } = useConnectivity();

  return (
    <header className="app-header">
      <div>
        <div className="section-title">Environment</div>
        <div className="text-subtle" style={{ fontSize: 12 }}>
          Phase 1 · connectivity shell
        </div>
      </div>
      <div className="spacer" />
      <StatusPill online={isOnline} checking={isChecking} />
      <button type="button" className="btn btn-secondary" onClick={refetch} disabled={isChecking}>
        {isChecking ? 'Checking…' : 'Check connection'}
      </button>
    </header>
  );
}
