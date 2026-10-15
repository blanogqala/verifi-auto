import { Card } from '../ui/Card';
import { StatusBadge as Status } from '../ui/StatusBadge';
import { Car, Calendar, ArrowRight } from 'lucide-react';
import { quoteTotal } from '../../features/jobs/jobWorkflow';
export function JobCard({ job: j, onView }: any) {
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
      <div className="job-card-bottom">
        <span>
          {j.items?.length ? 'Repair quote' : 'Assessment fee'}
          <b>R{j.items?.length ? quoteTotal(j).toLocaleString() : j.fee}</b>
        </span>
        <button className="text-link" onClick={onView}>
          View details <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}
