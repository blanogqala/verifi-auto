import { Card } from '../../components/ui/Card';

import { ArrowRight } from 'lucide-react';

import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Presentational view. State and actions are supplied by the owning layout. */
export function ReportsPage({ data, note, setDialog }: any) {
  return (
    <Card as="section" className="dash-panel">
      <h2>Reports & support</h2>
      <p className="muted">
        Illustrative support cases. No messages are sent outside this preview.
      </p>
      {data.reports.map((r: any) => (
        <article className="report-row" key={r.id}>
          <div className="panel-title">
            <span className="reference">{r.id}</span>
            <Status value={r.status} />
          </div>
          <h3>{r.title}</h3>
          <p>{r.note}</p>
          {r.status === 'Open' && (
            <button className="primary" onClick={() => setDialog({ kind: 'report', report: r })}>
              Review case <ArrowRight size={17} />
            </button>
          )}
          {r.resolution && <div className="notice">Resolution: {r.resolution}</div>}
        </article>
      ))}
    </Card>
  );
}
