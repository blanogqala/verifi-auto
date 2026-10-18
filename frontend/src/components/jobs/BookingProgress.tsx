import { Check, X } from 'lucide-react';
import { bookingProgress } from '../../features/jobs/bookingProgress';

export function BookingProgress({ job }: { job: any }) {
  const progress = bookingProgress(job);
  return (
    <div className="booking-progress">
      <ol className="progress-list">
        {progress.steps.map((step, index) => {
          const live = step.state === 'current' || step.state === 'stopped';
          return (
            <li
              key={step.id}
              className={'progress-step is-' + step.state}
              aria-current={live ? 'step' : undefined}
            >
              <span className="progress-mark" aria-hidden="true">
                {step.state === 'complete' ? <Check size={14} /> : step.state === 'stopped' ? <X size={14} /> : index + 1}
              </span>
              <span className="progress-label">{step.label}</span>
              {live ? <p className="progress-note">{step.note}</p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
