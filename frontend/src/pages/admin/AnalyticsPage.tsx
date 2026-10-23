import { SecurityActivityPage } from './SecurityActivityPage';
import { AdminAnalyticsOverviewPage } from './AdminOverviewPage';
import { ReportsPage } from './ReportsPage';
import type { AnalyticsSection } from '../../config/navigation';

const tabs: { id: AnalyticsSection; label: string; target: string }[] = [
  { id: 'analytics', label: 'Overview', target: 'reports' },
  { id: 'security', label: 'Security & activity', target: 'reports/security' },
];

export function AnalyticsPage({ apps, data, route, section, setDialog, live = false }: any) {
  // Retain old notification destinations without showing Support as an analytics tab.
  if (section === 'support')
    return (
      <>
        <button className="detail-back" onClick={() => route('notifications')}>
          Back to notifications
        </button>
        <ReportsPage data={data} setDialog={setDialog} />
      </>
    );
  return (
    <div className="admin-analytics">
      <nav className="profile-tablist" aria-label="Analytics sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={'analytics-tab-' + tab.id}
            type="button"
            className={section === tab.id ? 'selected' : ''}
            aria-current={section === tab.id ? 'page' : undefined}
            onClick={() => route(tab.target)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {section === 'security' ? (
        <SecurityActivityPage data={data} live={live} />
      ) : (
        <AdminAnalyticsOverviewPage
          apps={apps}
          data={data}
          route={route}
          openReview={(app: any) => route('applications/' + encodeURIComponent(app.id))}
        />
      )}
    </div>
  );
}
