import { Calendar, Check, X } from 'lucide-react';
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
export function AppointmentsPage({ jobs, onReject, onAccept, route, section }: any) {
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
            <div className="panel-title">
              <span className="reference">{bookingReference(job)}</span>
              <Status value={job.status} />
            </div>
            <h2>{job.vehicle}</h2>
            <p>
              <Calendar size={15} /> {job.date} at {job.time}
            </p>
            <p className="muted">Assessment fee R{job.fee}. Accepting does not approve a repair quote.</p>
            {job.rejectionReason ? (
              <div className="notice">
                <b>Rejection reason:</b> {job.rejectionReason}
              </div>
            ) : null}
            {section === 'pending' ? (
              <div className="button-row">
                <button className="primary" type="button" onClick={() => onAccept(job)}>
                  Accept <Check size={16} />
                </button>
                <button className="secondary" type="button" onClick={() => onReject(job)}>
                  Reject <X size={16} />
                </button>
              </div>
            ) : null}
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
