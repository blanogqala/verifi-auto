import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card } from './Card';

export function DetailBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="detail-back" onClick={onClick}>
      <ChevronLeft size={18} aria-hidden="true" />
      {label}
    </button>
  );
}

export function DetailHeader({
  kicker,
  title,
  summary,
  aside,
}: {
  kicker?: string;
  title: string;
  summary?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="detail-header">
      <div>
        {kicker ? <p className="detail-kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {summary ? <div className="detail-summary">{summary}</div> : null}
      </div>
      {aside ? <div className="detail-header-aside">{aside}</div> : null}
    </header>
  );
}

export function DetailCard({
  icon,
  title,
  action,
  children,
  footer,
  quiet = false,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  quiet?: boolean;
}) {
  return (
    <Card as="section" className={'detail-card' + (quiet ? ' detail-card-quiet' : '')}>
      <div className="detail-card-head">
        <h2>
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="detail-card-body">{children}</div>
      {footer ? <div className="detail-card-foot">{footer}</div> : null}
    </Card>
  );
}

export function DetailFields({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="detail-fields">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
