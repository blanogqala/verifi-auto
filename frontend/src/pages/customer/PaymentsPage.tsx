import { Card } from '../../components/ui/Card';

import { FileText, CheckCircle2, Wallet } from 'lucide-react';
import { quoteTotal } from '../../demo';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { EmptyState as Empty } from '../../components/ui/EmptyState';

/** Presentational view. State and actions are supplied by the owning layout. */
export function PaymentsPage({ filter, jobs, note, setDialog }: any) {
  return (
    <>
      <div className="metrics three">
        <Metric
          label="Awaiting payment"
          value={
            'R' +
            jobs
              .filter((j: any) => j.status === 'Awaiting payment')
              .reduce((a: number, j: any) => a + quoteTotal(j), 0)
              .toLocaleString()
          }
          note="Completed repair work"
          Icon={Wallet}
        />
        <Metric
          label="Demo payments"
          value={jobs.filter((j: any) => j.paid).length}
          note="No real money transferred"
          Icon={CheckCircle2}
        />
        <Metric
          label="Approved repair value"
          value={
            'R' +
            jobs
              .filter((j: any) => j.quoteApproved)
              .reduce((a: number, j: any) => a + quoteTotal(j), 0)
              .toLocaleString()
          }
          note="Excludes assessment fees"
          Icon={FileText}
        />
      </div>
      <Card as="section" className="dash-panel">
        <h2>Invoices & receipts</h2>
        {jobs.filter((j: any) => ['Awaiting payment', 'Completed'].includes(j.status)).length ? (
          jobs
            .filter((j: any) => ['Awaiting payment', 'Completed'].includes(j.status))
            .map((j: any) => (
              <div className="payment-row" key={j.id}>
                <FileText size={23} />
                <div>
                  <b>{j.id}</b>
                  <small>
                    {j.provider} · {j.vehicle}
                  </small>
                </div>
                <strong>R{quoteTotal(j).toLocaleString()}</strong>
                <Status value={j.paid ? 'Demo paid' : 'Awaiting payment'} />
                <button
                  className="primary"
                  onClick={() => setDialog({ kind: j.paid ? 'receipt' : 'pay', job: j })}
                >
                  {j.paid ? 'View receipt' : 'Review & pay'}
                </button>
              </div>
            ))
        ) : (
          <Empty
            title="No invoices due yet."
            text="Invoices appear when approved repairs are completed in the mechanic preview."
          />
        )}
      </Card>
    </>
  );
}
