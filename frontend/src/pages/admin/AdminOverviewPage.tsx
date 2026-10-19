import { StatusChart, CityChart } from './AdminCharts';
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
export function AdminAnalyticsOverviewPage({ apps, data }: any) {
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
          <StatusChart rows={counts(jobs, 'status')} label="Bookings by status" />
        </DetailCard>
        <DetailCard title="Bookings by customer city">
          <CityChart rows={cities} label="Bookings by customer city" />
          <p className="muted">
            Based on recorded customer cities. Missing locations stay visible.
          </p>
        </DetailCard>
      </div>
    </div>
  );
}
