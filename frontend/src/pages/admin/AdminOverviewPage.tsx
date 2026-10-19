import {
  Users,
  ShieldCheck,
  ClipboardCheck,
  Wrench,
  Wallet,
  Car,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { DetailCard } from '../../components/ui/DetailChrome';
import { customerRecords } from '../../features/admin/customerRecords';
import { accountMetrics } from '../../features/admin/detailRecords';
import { money, uniqueJobs } from '../../features/admin/paymentRecords';
import { adminJobRows, disputeRows } from '../../features/admin/filters';
import { isManagedProfessional } from '../../features/admin/applicationRecords';

function counts(rows: any[], key: string) {
  const result = new Map<string, number>();
  rows.forEach((row) => {
    const label = row[key] || 'Not recorded';
    result.set(label, (result.get(label) || 0) + 1);
  });
  return [...result.entries()].sort((a, b) => b[1] - a[1]);
}
function Bars({ rows, label }: { rows: [string, number][]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return rows.length ? (
    <div
      className="admin-bars"
      role="img"
      aria-label={`${label}: ${rows.map(([name, value]) => `${name}: ${value}`).join(', ')}`}
    >
      {rows.map(([name, value]) => (
        <div className="admin-bar-row" key={name}>
          <div>
            <span>{name}</span>
            <b>{value}</b>
          </div>
          <div className="admin-bar-track">
            <span style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p>No records available yet.</p>
  );
}
export function AdminOverviewPage({ apps, data, route, openReview }: any) {
  const jobs = uniqueJobs(data.jobs);
  const stats = accountMetrics(jobs);
  const customers = customerRecords(data);
  const pending = apps.filter((a: any) => a.status === 'Pending review');
  const disputes = disputeRows(data).filter((d: any) => d.status !== 'Resolved');
  const cities = counts(adminJobRows({ ...data, jobs }), 'city');
  return (
    <div className="admin-overview">
      <p className="muted">Your platform at a glance · Current browser-demo records</p>
      <div className="metrics">
        <MetricCard
          label="Total customers"
          value={customers.length}
          note="Registered demo accounts"
          Icon={Users}
        />
        <MetricCard
          label="Total professionals"
          value={apps.filter(isManagedProfessional).length}
          note="Approved and suspended"
          Icon={ShieldCheck}
        />
        <MetricCard
          label="Pending applications"
          value={pending.length}
          note="Waiting for review"
          Icon={ClipboardCheck}
        />
        <MetricCard
          label="Total bookings"
          value={stats.total}
          note="Unique booking records"
          Icon={Car}
        />
        <MetricCard
          label="Active jobs"
          value={stats.active}
          note="Requests and ongoing work"
          Icon={Wrench}
        />
        <MetricCard
          label="Completed jobs"
          value={stats.completed}
          note="Completed workflow"
          Icon={CheckCircle}
        />
        <MetricCard
          label="Recorded payments"
          value={money(stats.paid)}
          note="Gross demo payments · not commission"
          Icon={Wallet}
        />
        <MetricCard
          label="Open disputes"
          value={disputes.length}
          note="Awaiting an administrative outcome"
          Icon={AlertCircle}
        />
      </div>
      <div className="admin-detail-grid">
        <DetailCard title="Bookings by status">
          <Bars rows={counts(jobs, 'status')} label="Bookings by status" />
        </DetailCard>
        <DetailCard title="Bookings by customer city">
          <Bars rows={cities} label="Bookings by customer city" />
          <p className="muted">
            Based on recorded customer cities. Missing locations stay visible.
          </p>
        </DetailCard>
      </div>
      <div className="admin-detail-grid">
        <DetailCard
          title="Application queue"
          action={
            <button className="text-link" onClick={() => route('applications')}>
              View all
            </button>
          }
        >
          {pending.length ? (
            pending.slice(0, 4).map((a: any) => (
              <button className="admin-record-link" key={a.id} onClick={() => openReview(a)}>
                <span>
                  <b>{a.name}</b>
                  <small>
                    {a.city} · {a.type}
                  </small>
                </span>
                <span>Review</span>
              </button>
            ))
          ) : (
            <p>No applications waiting for review.</p>
          )}
        </DetailCard>
        <DetailCard title="Needs attention">
          <div className="admin-record-list">
            <button className="admin-record-link" onClick={() => route('jobs/disputes')}>
              <span>
                <b>Disputes</b>
                <small>{disputes.length} unresolved cases</small>
              </span>
              <span>View</span>
            </button>
            <button className="admin-record-link" onClick={() => route('reports/security')}>
              <span>
                <b>Security & activity</b>
                <small>Recent sign-ins and administrative decisions</small>
              </span>
              <span>View</span>
            </button>
            <button className="admin-record-link" onClick={() => route('notifications')}>
              <span>
                <b>Notifications</b>
                <small>Read platform updates</small>
              </span>
              <span>View</span>
            </button>
          </div>
        </DetailCard>
      </div>
    </div>
  );
}
