import { SecurityActivityPage } from './SecurityActivityPage';
import { AlertCircle, ClipboardCheck, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { MetricCard as Metric } from '../../components/ui/MetricCard';
import { ReportsPage } from './ReportsPage';
import type { AnalyticsSection } from '../../config/navigation';
import { isManagedProfessional, isPendingApplication } from '../../features/admin/applicationRecords';
import { uniqueJobs } from '../../features/admin/paymentRecords';

const tabs: { id: AnalyticsSection; label: string; target: string }[] = [
  { id: 'analytics', label: 'Overview', target: 'reports' },
  { id: 'security', label: 'Security & activity', target: 'reports/security' },
  { id: 'support', label: 'Support cases', target: 'reports/support' },
];

/** Counts from current demo records. No trends or historical charts. */
export function AnalyticsPage({ apps, customers, data, jobs, route, section, setDialog }: any) {
  const unique = uniqueJobs(jobs);
  const byStatus = new Map<string, number>();
  for (const job of unique) {
    const status = typeof job.status === 'string' && job.status ? job.status : 'Not recorded';
    byStatus.set(status, (byStatus.get(status) || 0) + 1);
  }
  const statuses = Array.from(byStatus.entries());
  return (
    <div className="admin-analytics">
      <div className="profile-tablist" role="tablist" aria-label="Analytics and support">
        {tabs.map((tab) => {
          const selected = section === tab.id;
          return (
            <button
              key={tab.id}
              id={'analytics-tab-' + tab.id}
              type="button"
              role="tab"
              className={selected ? 'selected' : ''}
              aria-selected={selected}
              onClick={() => route(tab.target)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {section === 'security' ? <SecurityActivityPage data={data} /> : section === 'support' ? (
        <ReportsPage data={data} setDialog={setDialog} />
      ) : (
        <>
          <p className="muted">
            These counts are calculated from the sample records in this browser. They are not trends
            or historical charts.
          </p>
          <div className="metrics">
            <Metric
              label="Pending applications"
              value={apps.filter(isPendingApplication).length}
              note="Waiting for review"
              Icon={ClipboardCheck}
            />
            <Metric
              label="Approved professionals"
              value={apps.filter((item: any) => item.status === 'Approved' && isManagedProfessional(item)).length}
              note="Current verification status"
              Icon={ShieldCheck}
            />
            <Metric
              label="Customers"
              value={customers.length}
              note="Sample customer accounts"
              Icon={UserRound}
            />
            <Metric
              label="Open support cases"
              value={(data.reports || []).filter((report: any) => report.status === 'Open').length}
              note="Support follow-up needed"
              Icon={AlertCircle}
            />
          </div>
          <Card as="section" className="dash-panel">
            <h2>Jobs by status</h2>
            {statuses.length ? (
              <div className="status-counts">
                {statuses.map(([status, count]) => (
                  <div key={status}>
                    <b>{status}</b>
                    <span>{count}</span>
                    <meter min={0} max={Math.max(unique.length, 1)} value={count} aria-label={status + ' jobs'} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No jobs are recorded in this preview.</p>
            )}
            <p className="muted">Each job is counted once. {unique.length} job{unique.length === 1 ? '' : 's'} in total.</p>
          </Card>
        </>
      )}
    </div>
  );
}
