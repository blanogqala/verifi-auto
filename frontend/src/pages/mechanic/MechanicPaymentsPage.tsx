import { FileText, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { quoteTotal } from '../../demo';
import {
  awaitingCustomerPayments,
  recordedCustomerPayments,
} from '../../features/admin/paymentRecords';

function amount(job: any) {
  return job.items?.length ? `R${quoteTotal(job).toLocaleString()}` : 'Not recorded';
}

/** Mechanic view of customer payment records. This does not settle funds to a bank. */
export function MechanicPaymentsPage({ jobs, setDialog }: any) {
  const awaiting = awaitingCustomerPayments(jobs);
  const recorded = recordedCustomerPayments(jobs);
  const rows = [...awaiting, ...recorded];

  return (
    <div className="mechanic-payments">
      <div className="notice">
        Demo payments only. “Customer payment recorded” means the customer preview marked the
        invoice paid. It does not confirm a bank payout or money available to withdraw.
      </div>
      <div className="metrics">
        <Metric
          label="Awaiting customer payment"
          value={awaiting.length}
          note="Completed demo work"
          Icon={Wallet}
        />
        <Metric
          label="Customer payments recorded"
          value={recorded.length}
          note="No bank settlement in this preview"
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
                <b>{job.id}</b>
                <small>
                  {job.vehicle}
                  {job.provider ? ` · ${job.provider}` : ''}
                </small>
                <span>
                  {job.paidAt ? `Recorded ${job.paidAt}` : 'Payment date not recorded'}
                  {job.paymentReference ? ` · ${job.paymentReference}` : ''}
                </span>
              </div>
              <strong>{amount(job)}</strong>
              <Status value={job.paid ? 'Customer payment recorded' : 'Awaiting customer payment'} />
              <button
                className="secondary"
                type="button"
                onClick={() => setDialog({ kind: job.paid ? 'receipt' : 'invoice', job })}
              >
                {job.paid ? 'View receipt' : 'View invoice'}
              </button>
            </div>
          ))
        ) : (
          <Empty
            title="No demo payments yet"
            text="Completed jobs appear here when they are awaiting customer payment, or after a customer payment is recorded."
          />
        )}
      </Card>
    </div>
  );
}
