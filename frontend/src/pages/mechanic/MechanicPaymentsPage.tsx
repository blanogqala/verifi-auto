import { FileText, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { quoteTotal } from '../../demo';
import { bookingReference } from '../../features/jobs/jobViews';
import {
  awaitingCustomerPayments,
  recordedCustomerPayments,
} from '../../features/admin/paymentRecords';

function amount(job: any) {
  if (typeof job.amountCents === 'number')
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
      job.amountCents / 100,
    );
  return job.items?.length ? `R${quoteTotal(job).toLocaleString()}` : 'Not recorded';
}

/** Mechanic view of customer payment records. This does not settle funds to a bank. */
export function MechanicPaymentsPage({ jobs, setDialog, connected }: any) {
  const awaiting = connected ? connected.awaiting : awaitingCustomerPayments(jobs);
  const recorded = connected ? connected.recorded : recordedCustomerPayments(jobs);
  const rows = [...awaiting, ...recorded];

  return (
    <div className="mechanic-payments">
      <div className="notice">
        {connected
          ? 'Customer payment records. A recorded payment is not confirmation of a bank payout. Test transactions are labelled.'
          : 'Demo payments only. Customer payment recorded means the customer preview marked the invoice paid. It does not confirm a bank payout or money available to withdraw.'}
      </div>
      <div className="metrics">
        <Metric
          label="Awaiting customer payment"
          value={awaiting.length}
          note="Approved quotations"
          Icon={Wallet}
        />
        <Metric
          label="Customer payments recorded"
          value={recorded.length}
          note={
            connected
              ? 'Recent transactions · not bank settlements'
              : 'No bank settlement in this preview'
          }
          Icon={FileText}
        />
      </div>
      <Card as="section" className="dash-panel">
        <h2>Payment records</h2>
        {rows.length ? (
          rows.map((job: any) => (
            <div className="payment-row" key={job.id}>
              <FileText size={23} />
              <div>
                <b>
                  {bookingReference(job)}
                  {job.quoteNumber ? ` · Quotation ${job.quoteNumber}` : ''}
                </b>
                <small>
                  {job.vehicle}
                  {job.provider ? ` · ${job.provider}` : ''}
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
            title={connected ? 'No payments yet' : 'No demo payments yet'}
            text="Completed jobs appear here when they are awaiting customer payment, or after a customer payment is recorded."
          />
        )}
      </Card>
    </div>
  );
}
