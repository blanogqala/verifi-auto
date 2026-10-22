import { FileText, Search, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { customerNameForJob } from '../../features/admin/customerRecords';
import {
  awaitingCustomerPayments,
  money,
  paymentRecordTotal,
  recordedCustomerPayments,
} from '../../features/admin/paymentRecords';
import { quoteTotal } from '../../demo';
import { bookingReference } from '../../features/jobs/jobViews';

const filters = ['All', 'Awaiting customer payment', 'Customer payment recorded'];

function rowsFor(jobs: any[], filter: string) {
  const awaiting = awaitingCustomerPayments(jobs);
  const recorded = recordedCustomerPayments(jobs);
  if (filter === 'Awaiting customer payment') return awaiting;
  if (filter === 'Customer payment recorded') return recorded;
  return [...awaiting, ...recorded];
}

function amount(job: any) {
  if (typeof job.amountCents === 'number')
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
      job.amountCents / 100,
    );
  return job.items?.length ? money(quoteTotal(job)) : 'Not recorded';
}

/** Recorded customer-to-mechanic payments. A paid invoice is not a bank settlement. */
export function FinancePage({
  customers,
  filter,
  jobs,
  query,
  setDialog,
  setFilter,
  setQuery,
  connected,
}: any) {
  const recorded = connected ? connected.recorded : recordedCustomerPayments(jobs);
  const awaiting = connected ? connected.awaiting : awaitingCustomerPayments(jobs);
  const selected = filters.includes(filter) ? filter : 'All';
  const needle = query.toLowerCase();
  const visible = (
    connected
      ? [
          ...(selected === 'Customer payment recorded' ? [] : awaiting),
          ...(selected === 'Awaiting customer payment' ? [] : recorded),
        ]
      : rowsFor(jobs, selected)
  ).filter((job: any) => {
    const customer = customerNameForJob(job, customers);
    return `${bookingReference(job)} ${customer} ${job.provider || ''} ${job.paymentReference || ''}`
      .toLowerCase()
      .includes(needle);
  });

  return (
    <div className="admin-finance">
      <div className="notice">
        {connected
          ? 'Customer payment records. A recorded payment is not confirmation of a bank payout. Test transactions are labelled.'
          : 'Demo payments only. Customer payment recorded means the customer preview marked the invoice paid. It does not confirm a bank payout or a platform settlement.'}
      </div>
      <div className="metrics">
        <Metric
          label="Customer payments recorded"
          value={money(
            connected
              ? recorded.reduce((n: number, r: any) => n + r.amountCents, 0) / 100
              : paymentRecordTotal(recorded),
          )}
          note={`${recorded.length} ${connected ? 'recorded' : 'demo'} invoice${recorded.length === 1 ? '' : 's'} · Not a bank settlement`}
          Icon={FileText}
        />
        <Metric
          label="Awaiting customer payment"
          value={money(
            connected
              ? awaiting.reduce((n: number, r: any) => n + r.amountCents, 0) / 100
              : paymentRecordTotal(awaiting),
          )}
          note="Completed work, payment not recorded"
          Icon={Wallet}
        />
      </div>
      <div className="table-controls">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search job, customer, or mechanic"
          />
        </div>
        <select
          aria-label="Filter payments"
          value={selected}
          onChange={(event) => setFilter(event.target.value)}
        >
          {filters.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <Card as="section" className="dash-panel">
        <h2>Payment records</h2>
        {visible.length ? (
          visible.map((job: any) => (
            <div className="payment-row" key={job.id}>
              <FileText size={23} />
              <div>
                <b>
                  {bookingReference(job)}
                  {job.quoteNumber ? ` · Quotation ${job.quoteNumber}` : ''}
                </b>
                <small>
                  {customerNameForJob(job, customers)} · {job.provider || 'Mechanic not recorded'}
                </small>
                <span>
                  {job.paidAt ? `Recorded ${job.paidAt}` : 'Payment date not recorded'}
                  {job.paymentReference ? ` · ${job.paymentReference}` : ''}
                  {job.test ? ' · Test payment' : ''}
                </span>
              </div>
              <strong>{amount(job)}</strong>
              <Status
                value={job.paid ? 'Customer payment recorded' : 'Awaiting customer payment'}
              />
              <button
                className="secondary"
                type="button"
                onClick={() => setDialog({ kind: job.paid ? 'receipt' : 'invoice', job })}
              >
                {connected ? 'View booking' : job.paid ? 'View receipt' : 'View invoice'}
              </button>
            </div>
          ))
        ) : (
          <Empty
            title={
              recorded.length || awaiting.length
                ? 'No matching payments.'
                : connected
                  ? 'No payments yet'
                  : 'No demo payments yet'
            }
            text={
              recorded.length || awaiting.length
                ? 'Try another search or payment status.'
                : 'Completed jobs appear here when they are awaiting customer payment, or after a customer payment is recorded.'
            }
          />
        )}
      </Card>
    </div>
  );
}
