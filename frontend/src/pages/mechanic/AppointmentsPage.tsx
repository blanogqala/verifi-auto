import { ArrowRight, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import type { AppointmentSection } from '../../config/navigation';
import { bookingReference, isCancelledRequest, isPendingRequest, isRejectedRequest } from '../../features/jobs/jobViews';

const tabs: { id: AppointmentSection; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

/** Requests waiting on the mechanic. Accepted work stays on Jobs. */
export function AppointmentsPage({ customerName, jobs, onOpen, route, section }: any) {
  const pending = jobs.filter(isPendingRequest);
  const rejected = jobs.filter(isRejectedRequest);
  const cancelled = jobs.filter(isCancelledRequest);
  const visible = section === 'rejected' ? rejected : section === 'cancelled' ? cancelled : pending;

  return (
    <div className="mechanic-appointments">
      <div className="profile-tablist folder-tabs" role="tablist" aria-label="Appointment requests">
        {tabs.map((tab) => {
          const selected = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={selected ? 'selected' : ''}
              aria-selected={selected}
              onClick={() => route('appointments/' + tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {visible.length ? (
        visible.map((job: any) => (
          <Card as="article" className="dash-panel appointment-card" key={job.id}>
            <button
              type="button"
              className="appointment-hit"
              onClick={() => onOpen(job)}
              aria-label={`Open appointment ${bookingReference(job)}`}
            >
              <span className="panel-title">
                <span className="reference">{bookingReference(job)}</span>
                <Status value={job.status} />
              </span>
              <strong>{job.vehicle}</strong>
              <span>{customerName(job)}</span>
              <span>
                <Calendar size={15} aria-hidden="true" /> {job.date} at {job.time}
              </span>
              <span className="muted">Assessment fee R{job.fee}</span>
              {job.rejectionReason ? <span>Rejection reason: {job.rejectionReason}</span> : null}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </Card>
        ))
      ) : (
        <Empty
          title={
            section === 'rejected'
              ? 'No rejected requests'
              : section === 'cancelled'
                ? 'No cancelled requests'
                : 'No pending requests'
          }
          text={
            section === 'pending'
              ? 'New assessment requests appear here until you accept or reject them.'
              : section === 'rejected'
                ? 'Requests you reject, with the reason you gave, stay here.'
                : 'Requests cancelled before you accept them appear here.'
          }
        />
      )}
    </div>
  );
}
