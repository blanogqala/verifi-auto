import { Card } from '../../components/ui/Card';

import { ArrowRight, FileText } from 'lucide-react';
import { quoteTotal } from '../../demo';
import { pricingNote } from '../../features/jobs/pricingModel';
import { bookingReference } from '../../features/jobs/jobViews';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Presentational view. State and actions are supplied by the owning layout. */
export function QuotesPage({ filter, jobs, name, onEdit, quoteEditor, role, setDialog }: any) {
  return (
    <>
      <div className="workspace-note">
        {role === 'customer'
          ? 'Review itemised repair costs before approving. The total is the submitted quotation.'
          : 'Confirm the request, then send a quotation. Include assessment, parts, labour, and any other charge. Work starts only after approval.'}
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
                  <span>{i.name}{i.approved === false ? ' · Deferred — not authorised' : ''}</span>
                  <b>R{Number(i.amount).toLocaleString()}</b>
                </div>
              ))}
              <div className="invoice-line total">
                <span>Quotation total</span>
                <b>R{quoteTotal(j).toLocaleString()}</b>
              </div>
              <small className="muted">{pricingNote(j)}</small>
              <p className="muted">{j.notes || 'No repair quote prepared yet.'}</p>
              <div className="button-row">
                {role === 'customer' && !j.paid && ['Awaiting approval', 'Approved'].includes(j.status) ? (
                  <>
                    <button
                      className="primary"
                      onClick={() => setDialog({ kind: 'approve', job: j })}
                    >
                      Review & approve <ArrowRight size={16} />
                    </button>

                  </>
                ) : role === 'mechanic' &&
                  ['Confirmed', 'Awaiting approval', 'Changes requested'].includes(j.status) ? (
                  <button className="primary" onClick={() => (onEdit ? onEdit(j) : quoteEditor(j))}>
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
