import { Card } from '../../components/ui/Card';

import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Car,
  Calendar,
  FileText,
  UserRound,
  Upload,
  ClipboardCheck,
  AlertCircle,
  Siren,
  Users,
} from 'lucide-react';

import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { isPendingRequest } from '../../features/jobs/jobViews';
import { MetricCard as Metric } from '../../components/ui/MetricCard';

/** Presentational view. State and actions are supplied by the owning layout. */
export function OverviewPage({
  apps,
  cardJobs,
  data,
  filter,
  jobs,
  name,
  note,
  openReview,
  role,
  route,
  summary,
  live = false,
}: any) {
  return (
    <>
      <div className="dashboard-banner">
        <div>
          <span className="chip">
            {role === 'customer'
              ? 'YOUR CAR. YOUR CONFIDENCE.'
              : role === 'mechanic'
                ? 'YOUR NEXT STEP'
                : 'REVIEW WITH CONFIDENCE'}
          </span>
          <h2>
            {role === 'customer'
              ? 'Good care starts with clarity.'
              : role === 'mechanic'
                ? 'Make your expertise visible.'
                : 'Trust starts with a thorough review.'}
          </h2>
          <p>
            {role === 'customer'
              ? 'Review quotes, follow your appointments, and keep every service chapter.'
              : role === 'mechanic'
                ? 'Complete your profile and submit supporting documents for review.'
                : 'Check evidence, request changes, and manage professional credentials.'}
          </p>
          <button
            className="text-link"
            onClick={() =>
              route(
                role === 'customer'
                  ? 'quotes'
                  : role === 'mechanic'
                    ? 'profile/verification'
                    : 'applications',
              )
            }
          >
            {role === 'customer'
              ? 'Review your quotes'
              : role === 'mechanic'
                ? 'View your application'
                : 'Review applications'}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-illustration">
          {role === 'customer' ? (
            <Car size={125} strokeWidth={0.8} />
          ) : role === 'mechanic' ? (
            <Wrench size={110} strokeWidth={0.8} />
          ) : (
            <ShieldCheck size={115} strokeWidth={0.8} />
          )}
        </div>
      </div>
      {role === 'customer' && (
        <div className="roadside-overview-action">
          <div><Siren size={23} /><span><strong>Need help on the road?</strong><small>Tyre trouble, a stalled engine or a breakdown</small></span></div>
          <button className="roadside-overview-button" type="button" onClick={() => route('emergency')}>Emergency roadside help <ArrowRight size={17} /></button>
        </div>
      )}
      {role === 'mechanic' && jobs.some((j: any) => j.kind === 'EMERGENCY' && j.status === 'Requested') && (
        <button className="roadside-mechanic-alert" type="button" onClick={() => route('appointments/emergency')}><Siren size={22} /><strong>Urgent roadside requests need attention</strong><ArrowRight size={19}/></button>
      )}
      <div className="metrics">
        {role === 'customer' ? (
          <>
            <Metric
              label="Active bookings"
              value={
                summary?.activeBookings ??
                jobs.filter((j: any) => !['Completed', 'Cancelled', 'Rejected'].includes(j.status))
                  .length
              }
              note="Requests and ongoing work"
              Icon={Calendar}
            />
            <Metric
              label="Quotes to review"
              value={
                summary?.quotesToReview ??
                jobs.filter((j: any) => j.status === 'Awaiting approval').length
              }
              note="Your approval comes first"
              Icon={FileText}
            />
            <Metric
              label="Vehicles"
              value={summary?.vehicles ?? data.vehicles.length}
              note="In your personal garage"
              Icon={Car}
            />
            <Metric
              label="Service records"
              value={summary?.serviceRecords ?? data.records.length}
              note="Your vehicle’s story"
              Icon={ClipboardCheck}
            />
          </>
        ) : role === 'mechanic' ? (
          <>
            <Metric
              label="New requests"
              value={jobs.filter((j: any) => j.status === 'Requested').length}
              note="Awaiting your confirmation"
              Icon={Calendar}
            />
            <Metric
              label="Active jobs"
              value={jobs.filter((j: any) => ['Approved', 'In progress'].includes(j.status)).length}
              note="Customer-approved work"
              Icon={Wrench}
            />
            <Metric
              label="Quotes pending"
              value={jobs.filter((j: any) => j.status === 'Awaiting approval').length}
              note="Awaiting customer approval"
              Icon={FileText}
            />
            <Metric
              label="Documents"
              value={data.documents.length}
              note={live ? 'Your submitted evidence' : 'Sample evidence selected'}
              Icon={Upload}
            />
          </>
        ) : (
          <>
            <Metric
              label="Pending applications"
              value={
                summary?.applications ??
                apps.filter((a: any) => a.status === 'Pending review').length
              }
              note="Ready for review"
              Icon={ClipboardCheck}
            />
            <Metric
              label="Approved profiles"
              value={
                summary?.professionals ?? apps.filter((a: any) => a.status === 'Approved').length
              }
              note={live ? 'Approved professional directory' : 'Sample professional directory'}
              Icon={ShieldCheck}
            />
            <Metric
              label="Active jobs"
              value={
                summary?.activeJobs ??
                jobs.filter((j: any) => !['Cancelled', 'Completed', 'Rejected'].includes(j.status))
                  .length
              }
              note={live ? 'Across the platform' : 'Across the demo platform'}
              Icon={Wrench}
            />
            <Metric
              label={live ? 'Total customers' : 'Open reports'}
              value={
                live
                  ? (summary?.customers ?? 0)
                  : data.reports.filter((r: any) => r.status === 'Open').length
              }
              note={live ? 'Registered customer accounts' : 'Support follow-up needed'}
              Icon={AlertCircle}
            />
          </>
        )}
      </div>
      <div className="dashboard-columns">
        <Card as="section" className="dash-panel">
          <div className="panel-title">
            <h2>
              {role === 'admin'
                ? 'Application queue'
                : role === 'mechanic'
                  ? 'Pending requests'
                  : 'Recent appointments'}
            </h2>
            <button
              className="text-link"
              onClick={() =>
                route(
                  role === 'admin'
                    ? 'applications'
                    : role === 'mechanic'
                      ? 'appointments/pending'
                      : 'bookings',
                )
              }
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {role === 'admin' ? (
            apps.filter((item: any) => item.status === 'Pending review').slice(0, 3).length ? (
              apps
                .filter((item: any) => item.status === 'Pending review')
                .slice(0, 3)
                .map((a: any) => (
                  <button className="queue-row" onClick={() => openReview(a)} key={a.id}>
                    <span className="avatar">
                      <Wrench size={19} />
                    </span>
                    <div>
                      <b>{a.name}</b>
                      <small>
                        {a.city} · {a.type}
                      </small>
                    </div>
                    <Status value={a.status} />
                  </button>
                ))
            ) : (
              <p className="muted">No applications are waiting for review.</p>
            )
          ) : (
            <div className="mini-jobs">
              {role === 'mechanic' ? (
                jobs.some(isPendingRequest) ? (
                  cardJobs(jobs.filter(isPendingRequest), 2)
                ) : (
                  <p className="muted">No pending requests. Accepted work is under Jobs.</p>
                )
              ) : (
                cardJobs(jobs, 2)
              )}
            </div>
          )}
        </Card>
        <Card as="section" className="dash-panel quick-actions">
          <h2>Make your next move.</h2>
          {(role === 'customer'
            ? [
                ['garage', 'Your vehicles', 'View service history', Car],
                ['quotes', 'Your approval matters', 'Review the details first', FileText],
              ]
            : role === 'mechanic'
              ? [
                  [
                    'profile/business',
                    'Build your profile',
                    'Tell customers about your expertise',
                    UserRound,
                  ],
                  ['profile/documents', 'Add your evidence', 'Prepare your application', Upload],
                ]
              : [
                  ['professionals', 'Professionals', 'Approved and suspended profiles', Users],
                  ['reports', 'Analytics & support', 'Explore platform insights', AlertCircle],
                ]
          ).map(([t, a, b, I]: any) => (
            <button key={t} onClick={() => route(t)}>
              <I size={23} />
              <span>
                <b>{a}</b>
                <small>{b}</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))}
          <div className="workspace-note">
            {live
              ? 'Your vehicles, bookings and service history, together in one place.'
              : 'This connected preview uses browser-local sample data. Switching demo roles lets you explore the full journey.'}
          </div>
        </Card>
      </div>
    </>
  );
}
