import { Card } from '../ui/Card';
import { StatusBadge as Status } from '../ui/StatusBadge';
import { Car, Calendar, ArrowRight } from 'lucide-react';
import { quoteTotal } from '../../features/jobs/jobWorkflow';
export function JobCard({ job: j, onView, quoteAction }: any) {
  return (
    <Card as="article" className="job-card" key={j.id}>
      <div className="job-card-top">
        <span className="reference">{j.id}</span>
        <Status value={j.status} />
      </div>
      <h3>{j.provider}</h3>
      <p>
        <Car size={15} />
        {j.vehicle}
      </p>
      <p>
        <Calendar size={15} />
        {j.date} at {j.time}
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
            View details <ArrowRight size={16} />
          </button>
        </span>
      </div>
    </Card>
  );
}
