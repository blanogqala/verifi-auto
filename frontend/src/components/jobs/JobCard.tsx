import { bookingReference } from '../../features/jobs/jobViews';
import { Card } from '../ui/Card';
import { StatusBadge as Status } from '../ui/StatusBadge';
import { Car, Calendar, ArrowRight } from 'lucide-react';
import { quoteTotal } from '../../features/jobs/jobWorkflow';
import { formatDay } from '../../features/jobs/bookingProgress';

export function JobCard({ job: j, onView, quoteAction, registration = '', viewLabel = 'View details' }: any) {
  const vehicleName = j.vehicleLabel || j.vehicle || 'Vehicle not recorded';
  return (
    <Card as="article" className="job-card" key={j.id}>
      <div className="job-card-top">
        <span className="reference">{bookingReference(j)}</span>
        <Status value={j.status} />
      </div>
      <h3>{vehicleName}</h3>
      {registration ? <p className="job-registration">{registration}</p> : null}
      <p>
        <Car size={15} aria-hidden="true" />
        {j.provider || 'Professional not recorded'}
      </p>
      <p>
        <Calendar size={15} aria-hidden="true" />
        {j.date ? formatDay(j.date) : 'Date not recorded'}
        {j.time ? ` at ${j.time}` : ''}
      </p>
      {j.rejectionReason ? (
        <p>
          <b>Rejection reason:</b> {j.rejectionReason}
        </p>
      ) : null}
      <div className="job-card-bottom">
        <span>
          {j.items?.length ? 'Repair quote' : 'Assessment fee'}
          <b>R{j.items?.length ? quoteTotal(j).toLocaleString() : j.fee}</b>
        </span>
        <span className="job-card-actions">
          {quoteAction ? (
            <button className="text-link" type="button" onClick={quoteAction.onClick}>
              {quoteAction.label} <ArrowRight size={16} />
            </button>
          ) : null}
          <button className="text-link" type="button" onClick={onView}>
            {viewLabel} <ArrowRight size={16} />
          </button>
        </span>
      </div>
    </Card>
  );
}
