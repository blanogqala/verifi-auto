import { useState } from 'react';
import {
  bookingQuotations,
  canAddQuotation,
  newQuotation,
  quoteCanEdit,
  quoteCanPay,
} from '../../features/jobs/bookingQuotes';
import { formatZar, quoteTotalCents } from '../../features/jobs/quotations';
import { formatWhen } from '../../features/jobs/bookingProgress';
import { DetailCard } from '../ui/DetailChrome';
import { QuoteEditor } from './QuoteEditor';
import { QuoteSummary } from './QuoteSummary';

export function BookingQuotations({
  job,
  mechanic = false,
  actor,
  update,
  notify,
  onAction,
  setDialog,
}: any) {
  const [newId, setNewId] = useState('');
  const quotes = bookingQuotations(job);
  const pendingNew =
    newId && !quotes.some((quote) => quote.quoteId === newId) ? newQuotation(job, newId) : null;
  const visible = [...quotes, ...(pendingNew ? [pendingNew] : [])].filter(
    (quote) => mechanic || quote.items?.length,
  );
  const approved = quotes.filter((quote) => quote.quoteApproved);
  const paid = approved.filter((quote) => quote.paid);
  const sum = (list: any[]) =>
    formatZar(list.reduce((total, quote) => total + quoteTotalCents(quote.items || []), 0));

  return (
    <div className="booking-quotations">
      {quotes.length > 1 ? (
        <div className="quotation-totals" aria-label="Booking quotation totals">
          <span>
            Approved <strong>{sum(approved)}</strong>
          </span>
          <span>
            Demo paid <strong>{sum(paid)}</strong>
          </span>
          <span>
            Outstanding <strong>{sum(approved.filter((quote) => !quote.paid))}</strong>
          </span>
        </div>
      ) : null}
      {mechanic && canAddQuotation(job) ? (
        <div className="button-row">
          <button
            className="primary"
            type="button"
            disabled={!!pendingNew}
            onClick={() => setNewId(crypto.randomUUID())}
          >
            Add quotation
          </button>
          <span className="muted">Additional work needs its own customer approval.</span>
        </div>
      ) : null}
      {!visible.length ? (
        <DetailCard title="Quotations">
          <p>Your professional has not sent a quotation yet.</p>
        </DetailCard>
      ) : (
        <div className="quotation-cards-grid">
      {visible.map((quote) => {
        const editable =
          mechanic &&
          quoteCanEdit(quote) &&
          !['Completed', 'Cancelled', 'Rejected'].includes(job.status);
        const state =
          quote.status === 'Withdrawn'
            ? 'Withdrawn'
            : quote.paid
              ? 'Demo paid'
              : quote.quoteApproved
                ? 'Approved'
                : quote.items?.length
                  ? quote.status
                  : 'Draft';
        return (
          <DetailCard key={quote.quoteId} title={`Quotation ${quote.quoteNumber}`}>
            <div className="quotation-heading">
              <span className="quotation-state">{state}</span>
              {quote.items?.length ? (
                <strong>{formatZar(quoteTotalCents(quote.items))}</strong>
              ) : null}
            </div>
            {quote.items?.length ? <QuoteSummary job={quote} title="Repairs and charges" /> : null}
            {editable ? (
              <details className="fold" open={!quote.items?.length || undefined}>
                <summary>{quote.items?.length ? 'Edit quotation' : 'Prepare quotation'}</summary>
                <QuoteEditor
                  job={quote}
                  actor={actor}
                  update={update}
                  notify={notify}
                  onSent={() => setNewId('')}
                />
              </details>
            ) : null}
            {quote.paid ? (
              <p className="muted">
                {quote.paymentReference || 'Reference not recorded'}
                {quote.paidAt ? ` · ${formatWhen(quote.paidAt)}` : ''}
              </p>
            ) : null}
            <div className="button-row">
              {!mechanic &&
              !quote.paid &&
              ['Awaiting approval', 'Approved'].includes(quote.status) ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => setDialog({ kind: 'approve', job: quote })}
                >
                  {quote.quoteApproved ? 'Edit repair selection' : 'Review and approve'}
                </button>
              ) : null}
              {!mechanic && quoteCanPay(quote) ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => setDialog({ kind: 'pay', job: quote })}
                >
                  Review and pay
                </button>
              ) : null}
              {!mechanic && quote.paid ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setDialog({ kind: 'invoice', job: quote })}
                >
                  View invoice
                </button>
              ) : null}
              {mechanic &&
              job.status === 'In progress' &&
              quote.quoteId !== 'primary' &&
              quote.status === 'Ready to start' && quote.paid ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => onAction(quote, 'start-quote')}
                >
                  Start these repairs
                </button>
              ) : null}
              {mechanic &&
              quote.quoteId !== 'primary' &&
              !quote.quoteApproved &&
              !quote.paid &&
              ['Confirmed', 'Awaiting approval', 'Changes requested'].includes(quote.status) ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    pendingNew?.quoteId === quote.quoteId
                      ? setNewId('')
                      : onAction(quote, 'withdraw-quote')
                  }
                >
                  {pendingNew?.quoteId === quote.quoteId
                    ? 'Discard new quote'
                    : 'Withdraw quotation'}
                </button>
              ) : null}
            </div>
          </DetailCard>
        );
      })}
        </div>
      )}
    </div>
  );
}
