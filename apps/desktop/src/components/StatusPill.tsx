export function StatusPill({ online, checking }: { online: boolean; checking: boolean }) {
  if (checking) {
    return (
      <span className="badge badge-info">
        <span className="dot" style={{ background: 'currentColor' }} aria-hidden />
        Checking…
      </span>
    );
  }
  if (online) {
    return (
      <span className="badge badge-success">
        <span className="dot" style={{ background: 'currentColor' }} aria-hidden />
        Online
      </span>
    );
  }
  return (
    <span className="badge badge-warning">
      <span className="dot" style={{ background: 'currentColor' }} aria-hidden />
      Offline
    </span>
  );
}
