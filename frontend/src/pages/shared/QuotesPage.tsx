import { Card } from '../../components/ui/Card';

import { ArrowRight, FileText } from 'lucide-react';
import { quoteTotal } from '../../demo';
import { bookingReference } from '../../features/jobs/jobViews';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Presentational view. State and actions are supplied by the owning layout. */
export function QuotesPage({ filter, jobs, name, quoteEditor, role, setDialog }: any) {
  return (
    <>
      <div className="workspace-note">
        {role === 'customer'
          ? 'Review itemised repair costs before approving. Assessment fees are shown separately.'
          : 'Confirm an assessment first, then prepare a repair quote. Work can only start after customer approval.'}
      </div>
      <div className="job-grid">
        {jobs
          .filter((j: any) =>
            role === 'mechanic'
              ? !['Requested', 'Rejected'].includes(j.status) &&
                !(j.status === 'Cancelled' && j.accepted !== true)
              : j.items?.length > 0,
          )
          .map((j: any) => (
            <Card as="article" className="quote-card dash-panel" key={j.id}>
              <div className="panel-title">
                <span className="reference">{bookingReference(j)}</span>
                <Status value={j.status} />
              </div>
              <h2>{j.vehicle}</h2>
              <p>{j.provider}</p>
              {j.items?.map((i: any, k: number) => (
                <div className="invoice-line" key={k}>
                  <span>{i.name}</span>
                  <b>R{Number(i.amount).toLocaleString()}</b>
                </div>
              ))}
              <div className="invoice-line total">
                <span>Repair total</span>
                <b>R{quoteTotal(j).toLocaleString()}</b>
              </div>
              <small className="muted">Assessment fee: R{j.fee} · separate from repair total</small>
              <p className="muted">{j.notes || 'No repair quote prepared yet.'}</p>
              <div className="button-row">
                {role === 'customer' && j.status === 'Awaiting approval' ? (
                  <>
                    <button
                      className="primary"
                      onClick={() => setDialog({ kind: 'approve', job: j })}
                    >
                      Review & approve <ArrowRight size={16} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setDialog({ kind: 'changes', job: j })}
                    >
                      Request changes
                    </button>
                  </>
                ) : role === 'mechanic' &&
                  ['Confirmed', 'Awaiting approval', 'Changes requested'].includes(j.status) ? (
                  <button className="primary" onClick={() => quoteEditor(j)}>
                    {j.items?.length ? 'Edit quote' : 'Create quote'}
                    <FileText size={16} />
                  </button>
                ) : (
                  <button className="text-link" onClick={() => setDialog({ kind: 'job', job: j })}>
                    View job <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
