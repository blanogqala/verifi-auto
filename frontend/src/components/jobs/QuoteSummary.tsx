import { formatWhen } from '../../features/jobs/bookingProgress';
import { categoryLabel, formatZar, lineAmountCents, quoteTotalCents } from '../../features/jobs/quotations';

function showQuantity(items: any[]) {
  return items.some((item) => item?.quantity != null && item?.unitPriceCents != null);
}

export function QuoteSummary({ job, title = 'Quotation' }: { job: any; title?: string }) {
  const items = Array.isArray(job?.items) ? job.items : [];
  const versions = Array.isArray(job?.quoteVersions) ? job.quoteVersions : [];
  const current = versions.find((version: any) => version.version === job.quoteVersion) || versions[versions.length - 1];
  const total = quoteTotalCents(items);
  const withQty = showQuantity(items);
  const previous = versions.filter((version: any) => current && version.version !== current.version);

  return (
    <div className="quote-summary">
      <h3>{title}</h3>
      {current?.version ? (
        <p className="muted">
          Version {current.version}
          {current.submittedAt ? ` · Sent ${formatWhen(current.submittedAt)}` : ''}
          {job.approvedQuoteVersion && job.approvedQuoteVersion === job.quoteVersion ? ' · Approved' : ''}
          {job.approvedQuoteVersion && job.quoteVersion && job.approvedQuoteVersion !== job.quoteVersion
            ? ` · Version ${job.approvedQuoteVersion} was approved. This revision needs approval.`
            : ''}
        </p>
      ) : null}
      {items.length ? (
        <div className="quote-table">
          <div className={'quote-head' + (withQty ? ' quote-head-qty' : '')}>
            <span>Description</span>
            {withQty ? <span>Qty</span> : null}
            <span>Amount</span>
          </div>
          {items.map((item: any, index: number) => (
            <div className={'quote-line' + (withQty ? ' quote-line-qty' : '')} key={item.id || `${item.name}-${index}`}>
              <span>
                {categoryLabel(item.category || item.kind) ? <small>{categoryLabel(item.category || item.kind)}</small> : null}
                {item.name}
                {item.approved === false ? <small>Deferred — not authorised</small> : job.quoteApproved ? <small>Approved repair</small> : null}
              </span>
              {withQty ? <span>{item.quantity ?? '—'}</span> : null}
              <b>{formatZar(lineAmountCents(item))}</b>
            </div>
          ))}
          <div className={'quote-line quote-total' + (withQty ? ' quote-line-qty' : '')}>
            <span>Total</span>
            {withQty ? <span /> : null}
            <b>{formatZar(total)}</b>
          </div>
        </div>
      ) : (
        <p>No quotation has been sent.</p>
      )}
      {job?.notes ? <p>{job.notes}</p> : null}
      {job?.customerRequest ? <p>Customer request (not priced or authorised): {job.customerRequest}</p> : null}
      {job?.changeRequest ? <p>Change request: {job.changeRequest}</p> : null}
      {previous.length ? (
        <details className="fold">
          <summary>Previous quotations</summary>
          <ol className="activity-list">
            {previous
              .slice()
              .reverse()
              .map((version: any) => (
                <li key={version.version}>
                  <span>
                    Version {version.version}
                    {version.submittedAt ? ` · ${formatWhen(version.submittedAt)}` : ''}
                    {Number.isFinite(version.totalCents) ? ` · ${formatZar(version.totalCents)}` : ''}
                  </span>
                  {version.changeRequest ? <span>Change request: {version.changeRequest}</span> : null}
                </li>
              ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
