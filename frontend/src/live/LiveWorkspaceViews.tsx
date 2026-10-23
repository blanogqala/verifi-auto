import { AppointmentsPage } from '../pages/mechanic/AppointmentsPage';
import { MechanicPaymentsPage } from '../pages/mechanic/MechanicPaymentsPage';
import { FinancePage } from '../pages/admin/FinancePage';
import { useState } from 'react';
import { Calendar, Plus, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import { OverviewPage } from '../pages/shared/OverviewPage';
import { JobsPage } from '../pages/shared/JobsPage';
import { JobCard } from '../components/jobs/JobCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';
import { DetailTabs, DetailPanel } from '../components/ui/DetailTabs';
import { RoadLoader } from '../components/ui/RoadLoader';
import { useResource } from './useResource';
import { money } from './api';

const statuses: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In progress',
  AWAITING_PAYMENT: 'Awaiting payment',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};
// Presentation adapter only: mutations continue through the authenticated API.
export function bookingCardData(job: any) {
  const when = new Date(job.appointmentAt);
  const year = when.getFullYear(),
    month = String(when.getMonth() + 1).padStart(2, '0'),
    day = String(when.getDate()).padStart(2, '0');
  return {
    id: job.id,
    vehicle: [job.vehicle.year, job.vehicle.make, job.vehicle.model].join(' '),
    provider: job.professional.name,
    registration: job.vehicle.registration,
    customerName: job.customer?.name || '',
    date: `${year}-${month}-${day}`,
    time: when.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    status:
      job.quotes?.some((quote: any) => quote.status === 'SENT') &&
      !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(job.status)
        ? 'Awaiting approval'
        : statuses[job.status] || job.status,
    rejectionReason: job.rejectionReason,
  };
}
export function WorkspaceHeading({ title, action }: any) {
  return (
    <div className="workspace-heading">
      <h1>{title}</h1>
      {action}
    </div>
  );
}
export function CustomerOverviewView({ name, summary, go, loading = false, error = '' }: any) {
  const jobs = (summary.recentBookings || []).map(bookingCardData);
  return (
    <>
      <WorkspaceHeading
        title={`Welcome back, ${name.split(' ')[0]}.`}
        action={
          <button className="primary" onClick={() => go('dashboard/find')}>
            Find a professional <Plus size={17} />
          </button>
        }
      />
      <OverviewPage
        role="customer"
        live
        summary={summary}
        jobs={jobs}
        data={{ vehicles: [], records: [] }}
        apps={[]}
        route={(tab: string) => go('dashboard/' + (tab === 'quotes' ? 'bookings?review=1' : tab))}
        cardJobs={(rows: any[], count: number) =>
          error ? (
            <p role="alert">{error}</p>
          ) : loading ? (
            <RoadLoader label="Loading appointments…" />
          ) : rows.length ? (
            rows
              .slice(0, count)
              .map((job) => (
                <JobCard key={job.id} job={job} onView={() => go('dashboard/bookings/' + job.id)} />
              ))
          ) : (
            <div className="live-panel-empty">
              <Calendar size={30} aria-hidden="true" />
              <h3>No bookings yet</h3>
              <p>Your appointments will appear here once you book an assessment.</p>
              <button className="text-link" onClick={() => go('dashboard/find')}>
                Find a professional
              </button>
            </div>
          )
        }
      />
    </>
  );
}
export function LiveCustomerOverview({ user, revision, go }: any) {
  const { data, error } = useResource('/customer/overview', revision);
  return (
    <>
      <CustomerOverviewView
        name={user.name}
        go={go}
        loading={!data}
        error={error}
        summary={
          data || {
            activeBookings: '—',
            quotesToReview: '—',
            vehicles: '—',
            serviceRecords: '—',
            recentBookings: [],
          }
        }
      />
    </>
  );
}
export function LiveBookingList({ bookings, error, role, base, section, go }: any) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(section.includes('?review=1') ? 'Awaiting approval' : 'All');
  const appointmentTab = section.split('/')[1] || 'pending';
  const selectedStatus =
    ({ pending: 'REQUESTED', rejected: 'REJECTED', cancelled: 'CANCELLED' } as any)[
      appointmentTab
    ] || 'REQUESTED';
  const raw = (bookings || []).filter((job: any) =>
    base === 'appointments'
      ? job.status === selectedStatus
      : base === 'jobs'
        ? !['REQUESTED', 'REJECTED', 'CANCELLED'].includes(job.status)
        : true,
  );
  const rows = raw.map(bookingCardData);
  return (
    <>
      <WorkspaceHeading
        title={
          base === 'appointments'
            ? 'Appointments'
            : role === 'customer'
              ? 'My bookings'
              : 'Jobs & activity'
        }
        action={
          role === 'customer' ? (
            <button className="primary" onClick={() => go('dashboard/find')}>
              Find a professional <Plus size={17} />
            </button>
          ) : null
        }
      />
      {error ? (
        <Card as="section" className="dash-panel">
          <p role="alert">{error}</p>
        </Card>
      ) : !bookings ? (
        <RoadLoader label="Loading bookings…" />
      ) : base === 'appointments' ? (
        <AppointmentsPage
          jobs={bookings.map((job: any) => ({ ...bookingCardData(job), vehicleId: job.vehicleId }))}
          vehicles={bookings.map((job: any) => job.vehicle)}
          live
          customerName={(job: any) => job.customerName}
          section={appointmentTab}
          route={(path: string) => go('dashboard/' + path)}
          onOpen={(job: any) => go('dashboard/jobs/' + job.id)}
        />
      ) : (
        <JobsPage
          jobs={rows}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          emptyTitle={
            rows.length
              ? 'No bookings match.'
              : base === 'appointments'
                ? 'No appointments yet.'
                : 'No bookings yet.'
          }
          emptyText={
            rows.length
              ? 'Try another status or search.'
              : role === 'customer'
                ? 'Book an assessment with a professional. Your appointments and repair progress will appear here.'
                : 'New requests will appear here automatically.'
          }
          hint={(job: any) => job.customerName}
          cardJobs={(jobs: any[]) =>
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                registration={job.registration}
                audience={role}
                person={job.customerName}
                onView={() =>
                  go(
                    `dashboard/${role === 'customer' ? 'bookings' : base === 'appointments' ? 'appointments/' + appointmentTab : 'jobs'}/${job.id}`,
                  )
                }
              />
            ))
          }
        />
      )}
    </>
  );
}
export function LivePayments({ payments, error, bookings, go, role }: any) {
  const [tab, setTab] = useState('outstanding');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const outstanding = (bookings || []).flatMap((job: any) =>
    job.quotes
      .filter((q: any) => ['APPROVED', 'IN_PROGRESS'].includes(q.status) && !q.payment)
      .map((quote: any) => ({
        job,
        quote,
        amount: quote.lines
          .filter((l: any) => l.selected)
          .reduce((sum: number, l: any) => sum + l.quantity * l.unitPriceCents, 0),
      })),
  );
  const total = (payments || []).reduce((sum: number, p: any) => sum + p.amountCents, 0);
  const grouped = new Map<string, any[]>();
  for (const payment of payments || []) {
    const day = new Date(payment.paidAt).toLocaleDateString('en-ZA');
    grouped.set(day, [...(grouped.get(day) || []), payment]);
  }
  if (role !== 'customer') {
    const row = (job: any, quote: any, amountCents: number) => ({
      id: quote.id,
      bookingId: job.id,
      quoteNumber: quote.number,
      vehicle: bookingCardData(job).vehicle,
      provider: job.professional.name,
      customerId: job.customerId,
      amountCents,
    });
    const connected = {
      awaiting: outstanding.map(({ job, quote, amount }: any) => row(job, quote, amount)),
      recorded: (payments || []).map((p: any) => {
        const job = (bookings || []).find((j: any) => j.id === p.quote.bookingId);
        return {
          ...(job
            ? row(job, p.quote, p.amountCents)
            : {
                id: p.id,
                bookingId: p.quote.bookingId,
                quoteNumber: p.quote.number,
                amountCents: p.amountCents,
              }),
          paid: true,
          paidAt: new Date(p.paidAt).toLocaleDateString(),
          paymentReference: p.providerReference,
          test: p.provider === 'TEST',
        };
      }),
    };
    const setDialog = ({ job }: any) => go('dashboard/jobs/' + job.bookingId);
    return (
      <>
        <WorkspaceHeading title={role === 'admin' ? 'Finance' : 'Payments'} />
        {error ? (
          <p role="alert">{error}</p>
        ) : !bookings || !payments ? (
          <RoadLoader label="Loading payment records…" />
        ) : role === 'mechanic' ? (
          <MechanicPaymentsPage jobs={[]} connected={connected} setDialog={setDialog} />
        ) : (
          <FinancePage
            connected={connected}
            jobs={[]}
            customers={(bookings || []).map((j: any) => j.customer)}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            setDialog={setDialog}
          />
        )}
      </>
    );
  }
  return (
    <>
      <WorkspaceHeading title="Payments" />
      <div className="metrics three">
        <MetricCard
          label="Awaiting payment"
          value={
            bookings ? money(outstanding.reduce((sum: number, r: any) => sum + r.amount, 0)) : '—'
          }
          note="Approved quotations in your recent bookings"
          Icon={Wallet}
        />
        <MetricCard
          label="Recorded payments"
          value={payments?.length ?? '—'}
          note="Recent transactions"
          Icon={CheckCircle2}
        />
        <MetricCard
          label="Payment value"
          value={payments ? money(total) : '—'}
          note="Total of the transactions shown"
          Icon={FileText}
        />
      </div>
      <DetailTabs
        id="live-payments"
        label="Payment sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'outstanding', label: 'Outstanding' },
          { id: 'history', label: 'History' },
        ]}
      />
      <DetailPanel scope="live-payments" tabId="outstanding" value={tab}>
        <Card as="section" className="dash-panel">
          <h2>Awaiting payment</h2>
          {error ? (
            <p role="alert">{error}</p>
          ) : !bookings ? (
            <RoadLoader label="Loading quotations…" />
          ) : outstanding.length ? (
            outstanding.map(({ job, quote, amount }: any) => (
              <div className="payment-row" key={quote.id}>
                <FileText size={23} />
                <div>
                  <b>Quotation {quote.number}</b>
                  <small>
                    {job.professional.name} · {job.vehicle.make} {job.vehicle.model}
                  </small>
                </div>
                <strong>{money(amount)}</strong>
                <StatusBadge value="Awaiting payment" />
                <button className="text-link" type="button" onClick={() => go(`dashboard/bookings/${job.id}`)}>
                  View booking
                </button>
                <button
                  className="primary"
                  onClick={() => go(`dashboard/bookings/${job.id}`)}
                >
                  Review & pay
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              title="No payments due yet."
              text="Payment becomes available after you approve your selected repairs."
            />
          )}
        </Card>
      </DetailPanel>
      <DetailPanel scope="live-payments" tabId="history" value={tab}>
        <Card as="section" className="dash-panel">
          <h2>Payment history</h2>
          {error ? (
            <p role="alert">{error}</p>
          ) : !payments ? (
            <RoadLoader label="Loading payments…" />
          ) : payments.length ? (
            [...grouped].map(([day, rows]) => (
              <section key={day}>
                <h3>{day}</h3>
                {rows.map((payment) => (
                  <div className="payment-row" key={payment.id}>
                    <FileText size={23} />
                    <div>
                      <b>Quotation {payment.quote.number}</b>
                      <small>
                        {payment.provider === 'TEST' ? 'Test payment' : 'Confirmed payment'}
                      </small>
                    </div>
                    <strong>{money(payment.amountCents)}</strong>
                    <button
                      className="secondary"
                      onClick={() =>
                        go(
                          `dashboard/${role === 'customer' ? 'bookings' : 'jobs'}/${payment.quote.bookingId}`,
                        )
                      }
                    >
                      View booking and invoice
                    </button>
                  </div>
                ))}
              </section>
            ))
          ) : (
            <EmptyState
              title="No payments yet."
              text="Your paid invoices and payment records will appear here."
            />
          )}
        </Card>
      </DetailPanel>
    </>
  );
}

export function LiveMechanicOverview({ user, bookings, error, revision, go }: any) {
  const { data: documents, error: documentsError } = useResource('/documents', revision);
  const jobs = (bookings || []).map(bookingCardData);
  return (
    <>
      <WorkspaceHeading title={`Welcome, ${user.name.split(' ')[0]}.`} />
      {error || documentsError ? (
        <EmptyState title="Could not load your overview" text={error || documentsError} />
      ) : !bookings || !documents ? (
        <RoadLoader label="Loading your dashboard…" />
      ) : (
        <OverviewPage
          role="mechanic"
          live
          jobs={jobs}
          data={{ documents }}
          apps={[]}
          route={(tab: string) => go('dashboard/' + (tab === 'quotes' ? 'bookings?review=1' : tab))}
          cardJobs={(rows: any[], count: number) =>
            rows
              .slice(0, count)
              .map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  audience="mechanic"
                  person={job.customerName}
                  registration={job.registration}
                  onView={() => go('dashboard/appointments/pending/' + job.id)}
                />
              ))
          }
        />
      )}
    </>
  );
}
