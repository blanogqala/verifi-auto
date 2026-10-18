import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { bookingProgress, type ProgressState } from '../../features/jobs/bookingProgress';

const stateText: Record<ProgressState, string> = {
  complete: 'Completed',
  current: 'Current',
  stopped: 'Stopped',
  upcoming: 'Upcoming',
};

export function BookingProgress({ job }: { job: any }) {
  const progress = bookingProgress(job);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const revealed = useRef('');
  const live = progress.steps.find((step) => step.state === 'current' || step.state === 'stopped');
  const summary =
    live?.note ||
    (progress.steps.every((step) => step.state === 'complete') ? progress.steps[progress.steps.length - 1]?.note : '') ||
    '';
  const summaryId = 'booking-progress-note-' + String(job?.id || 'booking');

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const marker = String(job?.id || '') + ':' + (live?.id || 'complete');
    if (revealed.current === marker) return;
    revealed.current = marker;
    const target =
      scroller.querySelector<HTMLElement>('[aria-current="step"]') ||
      scroller.querySelector<HTMLElement>('.progress-step:last-child');
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const left = target.offsetLeft - (scroller.clientWidth - target.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
  }, [job?.id, live?.id]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    event.currentTarget.scrollBy({
      left: event.key === 'ArrowRight' ? 140 : -140,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  return (
    <div className="booking-progress">
      <div
        className="progress-scroller"
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Booking stages"
        onKeyDown={onKeyDown}
      >
        <ol className="progress-list">
          {progress.steps.map((step, index) => {
            const active = step.state === 'current' || step.state === 'stopped';
            return (
              <li
                key={step.id}
                className={'progress-step is-' + step.state}
                aria-current={active ? 'step' : undefined}
                aria-describedby={active ? summaryId : undefined}
              >
                <span className="progress-mark" aria-hidden="true">
                  {step.state === 'complete' ? <Check size={14} /> : step.state === 'stopped' ? <X size={14} /> : index + 1}
                </span>
                <span className="progress-label">{step.label}</span>
                <span className="visually-hidden">{stateText[step.state]}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {summary ? (
        <p className="progress-summary" id={summaryId}>
          {summary}
        </p>
      ) : null}
    </div>
  );
}
