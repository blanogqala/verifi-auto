import { type KeyboardEvent, type ReactNode } from 'react';

export type DetailTab = {
  id: string;
  label: string;
  badge?: number;
};

export function detailTabId(scope: string, tabId: string) {
  return scope + '-tab-' + tabId;
}

export function detailPanelId(scope: string, tabId: string) {
  return scope + '-panel-' + tabId;
}

export function DetailTabs({
  id,
  label,
  tabs,
  value,
  onChange,
}: {
  id: string;
  label: string;
  tabs: DetailTab[];
  value: string;
  onChange: (id: string) => void;
}) {
  function move(event: KeyboardEvent<HTMLDivElement>, next: string) {
    event.preventDefault();
    onChange(next);
    const button = document.getElementById(detailTabId(id, next));
    requestAnimationFrame(() => button?.focus());
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = Math.max(0, tabs.findIndex((tab) => tab.id === value));
    if (event.key === 'ArrowRight') move(event, tabs[(index + 1) % tabs.length].id);
    else if (event.key === 'ArrowLeft') move(event, tabs[(index - 1 + tabs.length) % tabs.length].id);
    else if (event.key === 'Home') move(event, tabs[0].id);
    else if (event.key === 'End') move(event, tabs[tabs.length - 1].id);
  }
  return (
    <div className="detail-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            id={detailTabId(id, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={detailPanelId(id, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.badge ? (
              <span className="tab-badge" aria-label={`${tab.badge} unread`}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function DetailPanel({
  scope,
  tabId,
  value,
  children,
}: {
  scope: string;
  tabId: string;
  value: string;
  children: ReactNode;
}) {
  const selected = tabId === value;
  return (
    <div
      className="detail-panel"
      role="tabpanel"
      id={detailPanelId(scope, tabId)}
      aria-labelledby={detailTabId(scope, tabId)}
      hidden={!selected}
      inert={selected ? undefined : true}
    >
      {children}
    </div>
  );
}
