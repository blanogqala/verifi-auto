import { useEffect, useRef } from 'react';
import { Star, X, ArrowUpRight, MessageSquare } from 'lucide-react';
import { ReviewStars } from './ReviewStars';
import { formatWhen } from '../../features/jobs/bookingProgress';

export function WorkshopReviewsDialog({ name, average, count, reviews, loading, error, onClose, onJob }: {
  name: string; average: number | null; count: number; reviews: any[];
  loading: boolean; error: string; onClose: () => void; onJob: (id: string) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    dismiss.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [])];
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prior?.focus?.(); };
  }, [onClose]);
  return (
    <div className="var-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={panel} className="var-modal workshop-reviews-dialog" role="dialog" aria-modal="true" aria-label="Customer reviews">
        <header className="var-modal-head">
          <div>
            <span className="var-eyebrow"><Star size={16}/> Workshop feedback</span>
            <h2>Customer reviews</h2>
            <p>{name} · Feedback on completed jobs</p>
          </div>
          <button ref={dismiss} type="button" className="var-close" onClick={onClose} aria-label="Close customer reviews"><X size={20}/></button>
        </header>
        <div className="var-modal-body">
          <div className="workshop-reviews-summary">
            <div><strong>{average == null ? '—' : average.toFixed(1)}</strong><span>out of 5 stars</span></div>
            <div>
              <div className="workshop-review-five" aria-label="Average review rating"><Star size={23} fill="currentColor" aria-hidden="true"/> {count ? 'Customer rated' : 'Awaiting first review'}</div>
              <p>{count} {count === 1 ? 'verified review' : 'verified reviews'} in total</p>
            </div>
          </div>
          <div className="workshop-review-feed">
            {loading && <p role="status">Loading customer reviews…</p>}
            {error && <p role="alert" className="form-error">{error}</p>}
            {!loading && !error && !reviews.length && (
              <div className="workshop-review-empty"><MessageSquare size={24}/>
                <strong>No reviews yet</strong><p>Once customers rate completed jobs, their feedback will appear here.</p>
              </div>
            )}
            {!loading && !error && reviews.map((review: any) => (
              <article className="workshop-review-entry" key={review.id}>
                <div className="workshop-review-entry-head">
                  <div><strong>{review.customerName || 'Customer'}</strong>
                    <small>{review.createdAt ? formatWhen(review.createdAt) : 'Date not recorded'}</small></div>
                  <ReviewStars rating={review.rating}/>
                </div>
                <p>{review.body || review.text || 'No written comment.'}</p>
                {review.vehicle && <small>Vehicle: {review.vehicle}</small>}
                {review.bookingId && <button type="button" className="text-link"
                  onClick={() => onJob(review.bookingId)}>View completed job <ArrowUpRight size={15}/></button>}
              </article>
            ))}
          </div>
          {!loading && reviews.length < count && <p className="muted">Showing the latest {reviews.length} of {count} customer reviews.</p>}
        </div>
      </section>
    </div>
  );
}
