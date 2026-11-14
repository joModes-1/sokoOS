import { useState } from 'react';

interface NavEntry {
  label: string;
  icon: string;
  /** Phase 1 ships the shell only; feature screens are enabled in later phases. */
  enabled: boolean;
}

const NAV: NavEntry[] = [
  { label: 'Dashboard', icon: '🏠', enabled: true },
  { label: 'Point of sale', icon: '🧾', enabled: false },
  { label: 'Sales', icon: '📈', enabled: false },
  { label: 'Inventory', icon: '📦', enabled: false },
  { label: 'Purchasing', icon: '🚚', enabled: false },
  { label: 'Catalogue', icon: '🏷️', enabled: false },
  { label: 'Reports', icon: '📊', enabled: false },
  { label: 'Settings', icon: '⚙️', enabled: false },
];

export function Sidebar() {
  const [active, setActive] = useState('Dashboard');

  return (
    <aside className="app-sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="brand-name">SokoOS</div>
          <div className="brand-sub">Desktop</div>
        </div>
      </div>

      <div className="nav-section">Workspace</div>
      <nav>
        {NAV.map((item) => {
          const isActive = item.enabled && item.label === active;
          return (
            <button
              key={item.label}
              type="button"
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => item.enabled && setActive(item.label)}
              disabled={!item.enabled}
              aria-current={isActive ? 'page' : undefined}
              title={item.enabled ? item.label : `${item.label} — enabled in a later phase`}
            >
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="spacer" />
      <div className="sidebar-foot">
        Feature modules appear here as later phases land. This build is a shell.
      </div>
    </aside>
  );
}
