import { useState } from 'react';
import {
  formatZar,
  lineAmountCents,
  quoteTotalCents,
  quoteLineKey,
  quoteReviewToken,
} from '../../features/jobs/quotations';

export function QuoteReview({
  job,
  onAction,
  live = false,
  busy = false,
}: {
  job: any;
  live?: boolean;
  busy?: boolean;
  onAction: (job: any, action: string, extra: any) => unknown;
}) {
  const items = job.items || [];
  const [selected, setSelected] = useState<string[]>(
    items
      .filter((i: any) => i.approved !== false)
      .map((i: any) => quoteLineKey(i, items.indexOf(i))),
  );
  const [request, setRequest] = useState(job.customerRequest || '');
  const total = quoteTotalCents(
    items
      .filter((i: any, k: number) => selected.includes(quoteLineKey(i, k)))
      .map((i: any) => ({ ...i, approved: true })),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAction(job, 'approve', {
          selectedLineIds: selected,
          reviewToken: quoteReviewToken(job),
          customerRequest: request,
        });
      }}
    >
      <h2>Choose your repairs</h2>
      <p>
        {job.vehicle} · {job.provider}
      </p>
      <p className="muted">
        Select the work you want done now. Unselected items stay visible as deferred and are
        excluded from payment.
      </p>
      <div className="quote-review-lines">
        {items.map((item: any, index: number) => {
          const key = quoteLineKey(item, index);
          const checked = selected.includes(key);
          return (
            <label className={'quote-review-line' + (checked ? ' selected' : '')} key={key}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? [...selected, key] : selected.filter((id) => id !== key),
                  )
                }
              />
              <span>
                <strong>{item.name}</strong>
                <small>{checked ? 'Approve this repair' : 'Defer — do not carry out'}</small>
              </span>
              <b>{formatZar(lineAmountCents(item))}</b>
            </label>
          );
        })}
      </div>
      <div className="invoice-line total">
        <span>Selected total</span>
        <b>{formatZar(total)}</b>
      </div>
      <label>
        Additional request (optional)
        <textarea
          value={request}
          maxLength={2000}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Ask about another repair or explain a change you need."
        />
      </label>
      <p className="muted">
        Requests do not add a charge or authorise extra work. The mechanic must price any changes
        and send a revised quote for your approval. Ask for a revision before paying if you want it
        included.
      </p>
      <div className="button-row">
        <button className="primary" disabled={busy || !selected.length || !(total > 0)}>
          {job.quoteApproved ? 'Save and approve repairs' : 'Approve selected repairs'}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={busy || request.trim().length < 3}
          onClick={() =>
            onAction(job, 'changes', {
              changeRequest: request.trim(),
              reviewToken: quoteReviewToken(job),
            })
          }
        >
          Request a revised quote
        </button>
      </div>
      <p className="muted">
        Approval does not take a payment.{' '}
        {live
          ? 'Review payment is available afterwards.'
          : 'Demo checkout is available afterwards.'}
      </p>
    </form>
  );
}
