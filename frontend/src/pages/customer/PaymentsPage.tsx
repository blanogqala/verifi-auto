import { CheckCircle2, FileText, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { quoteTotal } from '../../demo';
import {
  awaitingCustomerPayments,
  money,
  paymentRecordTotal,
  recordedCustomerPayments,
} from '../../features/admin/paymentRecords';
import { demoDocumentHtml, openDemoDocument } from '../../features/payments/demoDocuments';

function dayKey(value: string) {
  return value.slice(0, 10);
}

function groups(jobs: any[]) {
  const dated = new Map<string, any[]>();
  const undated: any[] = [];
  const sorted = [...jobs].sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
  for (const job of sorted) {
    if (typeof job.paidAt === 'string' && job.paidAt) {
      const key = dayKey(job.paidAt);
      dated.set(key, [...(dated.get(key) || []), job]);
    } else undated.push(job);
  }
  return { dated: [...dated.entries()], undated };
}

function openDoc(job: any, kind: 'invoice' | 'receipt') {
  openDemoDocument(demoDocumentHtml(job, kind), `${kind}-${job.id}.html`);
}

export function PaymentsPage({ go, jobs, setDialog }: any) {
  const awaiting = awaitingCustomerPayments(jobs);
  const recorded = recordedCustomerPayments(jobs);
  const history = groups(recorded);

  return (
    <>
      <div className="metrics three">
        <Metric
          label="Awaiting payment"
          value={money(paymentRecordTotal(awaiting))}
          note="Completed repair work"
          Icon={Wallet}
        />
        <Metric
          label="Demo payments"
          value={recorded.length}
          note="No real money transferred"
          Icon={CheckCircle2}
        />
        <Metric
          label="Approved repair value"
          value={money(paymentRecordTotal(jobs.filter((job: any) => job.quoteApproved)))}
          note="Excludes assessment fees"
          Icon={FileText}
        />
      </div>
      <Card as="section" className="dash-panel">
        <h2>Outstanding invoices</h2>
        {awaiting.length ? (
          awaiting.map((job: any) => (
            <PaymentRow key={job.id} job={job} go={go} setDialog={setDialog} />
          ))
        ) : (
          <Empty
            title="No invoices due yet."
            text="Invoices appear when approved repairs are completed in the mechanic preview."
          />
        )}
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Payment history</h2>
        {recorded.length ? (
          <>
            {history.dated.map(([day, rows]) => (
              <section key={day}>
                <h3>{day}</h3>
                {rows.map((job: any) => (
                  <PaymentRow key={job.id} job={job} go={go} setDialog={setDialog} />
                ))}
              </section>
            ))}
            {history.undated.length ? (
              <section>
                <h3>Date not recorded</h3>
                {history.undated.map((job: any) => (
                  <PaymentRow key={job.id} job={job} go={go} setDialog={setDialog} />
                ))}
              </section>
            ) : null}
          </>
        ) : (
          <Empty title="No demo payments yet." text="Paid invoices stay here as a record. They cannot be edited." />
        )}
      </Card>
    </>
  );
}

function PaymentRow({ job, go, setDialog }: any) {
  const paid = job.paid === true;
  return (
    <div className="payment-row">
      <FileText size={23} />
      <div>
        <b>{job.id}</b>
        <small>
          {job.provider} · {job.vehicle}
        </small>
        <span>{paid ? job.paidAt || 'Date not recorded' : 'Outstanding'}</span>
      </div>
      <strong>{job.items?.length ? money(quoteTotal(job)) : 'Not recorded'}</strong>
      <Status value={paid ? 'Demo paid' : 'Awaiting payment'} />
      <button className="text-link" type="button" onClick={() => go('dashboard/bookings/' + encodeURIComponent(job.id))}>
        View booking
      </button>
      <button className="secondary" type="button" onClick={() => openDoc(job, 'invoice')}>
        Demo invoice
      </button>
      {paid ? (
        <button className="secondary" type="button" onClick={() => openDoc(job, 'receipt')}>
          Demo receipt
        </button>
      ) : (
        <button className="primary" type="button" onClick={() => setDialog({ kind: 'pay', job })}>
          Review & pay
        </button>
      )}
    </div>
  );
}
