import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { bookingProgress } from '../../features/jobs/bookingProgress';

export function BookingProgress({ job }: { job: any }) {
  const progress = bookingProgress(job);
  const [open, setOpen] = useState(progress.current);
  return (
    <div className="booking-progress">
      <p className="progress-summary">{progress.summary}</p>
      <p className="muted">{progress.next}</p>
      <ol className="progress-list">
        {progress.steps.map((step, index) => {
          const expanded = open === index;
          return (
            <li key={step.id} className={'progress-step is-' + step.state}>
              <button
                type="button"
                className="progress-node"
                aria-current={step.state === 'current' || step.state === 'stopped' ? 'step' : undefined}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? -1 : index)}
              >
                <span className="progress-mark" aria-hidden="true">
                  {step.state === 'complete' ? <Check size={14} /> : step.state === 'stopped' ? <X size={14} /> : index + 1}
                </span>
                <span className="progress-label">{step.label}</span>
              </button>
              {expanded ? <p className="progress-note">{step.note}</p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
