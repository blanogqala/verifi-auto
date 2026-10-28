import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, Star, Wallet, X } from 'lucide-react';
import { applyJobTransition } from '../../features/demo/demoActions';
import { saveCustomerReview } from '../../features/reviews/customerReviews';
import { api } from '../../data-access/api';

function RatingDialog({ workshop, bookingId, initial, busy, error, onSave, onClose }: {
  workshop: string; bookingId: string; initial?: any; busy: boolean; error: string;
  onSave: (rating: number, comment: string) => Promise<void>; onClose: () => void;
}) {
  const [rating, setRating] = useState(Number(initial?.rating) || 0);
  const [comment, setComment] = useState(initial?.text || initial?.body || '');
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busy) onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),textarea:not([disabled])'
      ) || [])].filter((node) => node.getClientRects().length > 0);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault(); controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault(); controls[0].focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus?.(); };
  }, [busy, onClose]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(rating, comment.trim());
  }
  return (
    <div className="var-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section ref={dialog} className="var-modal service-rating-dialog" role="dialog" aria-modal="true" aria-label="Rate your workshop">
        <header className="var-modal-head">
          <div>
            <span className="var-eyebrow"><CheckCircle2 size={16}/> Service completed</span>
            <h2>How was your experience?</h2>
            <p>Rate {workshop || 'your workshop'} and share feedback about your repair.</p>
          </div>
          <button ref={closeButton} type="button" className="var-close" aria-label="Close rating" disabled={busy} onClick={onClose}><X size={21}/></button>
        </header>
        <div className="var-modal-body">
          <form className="service-review-form" onSubmit={(event) => void submit(event)}>
            <fieldset>
              <legend>Choose your star rating</legend>
              <div className="service-stars" role="radiogroup" aria-label="Workshop rating">
                {[1,2,3,4,5].map((number) => (
                  <label key={number} title={number + ' star' + (number === 1 ? '' : 's')}>
                    <input name={'rating-' + bookingId} type="radio" value={number}
                      checked={rating === number} required onChange={() => setRating(number)}/>
                    <Star size={30} fill={number <= rating ? 'currentColor' : 'none'}/>
                    <span className="visually-hidden">{number} stars</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor={'service-comment-' + bookingId}>Your review
              <textarea id={'service-comment-' + bookingId} value={comment} required minLength={8} maxLength={1000}
                rows={5} onChange={(event) => setComment(event.target.value)}
                placeholder="What was repaired, and how was the service?"/>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="service-rating-actions">
              <button type="button" className="secondary" disabled={busy} onClick={onClose}>Maybe later</button>
              <button className="primary" type="submit" disabled={busy || rating < 1 || comment.trim().length < 8}>
                {busy ? 'Saving review…' : initial ? 'Update review' : 'Submit review'}
              </button>
            </div>
            <p className="muted">Your rating and comment appear on the workshop's public profile after submission.</p>
          </form>
        </div>
      </section>
    </div>
  );
}

/** Customer confirms completed repairs. Confirmation is a booking action only:
 * it does not transfer escrow funds or make a payment-provider claim.
 */
export function ServiceConfirmationCard({ job, customerId, data, update, notify, live = false, refresh = () => {} }: any) {
  const [reason, setReason] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showRating, setShowRating] = useState(false);
  const reviewed = (data.customerReviews || []).find((item: any) => item.bookingId === job.id);

  async function act(action: 'confirm-work' | 'dispute-work') {
    if (busy) return;
    if (action === 'dispute-work' && reason.trim().length < 10) {
      setError('Please explain the problem in at least 10 characters.');
      return;
    }
    setBusy(true); setError('');
    try {
      if (live) {
        // The server creates the official service record when it completes the
        // booking. Do not apply the demo transition to live state: that inserts
        // a local record that the connected persistence layer cannot upload.
        await api('/bookings/' + encodeURIComponent(job.id) + '/actions', 'POST', {
          action, version: job.version,
          ...(action === 'dispute-work' ? { reason: reason.trim() } : {}),
        });
        refresh();
      } else {
        const result = await update((current: any) => applyJobTransition(current, job, action,
          action === 'dispute-work' ? { reason: reason.trim() } : {},
          { role: 'customer', id: customerId }).data);
        if (result === false) throw Error('Could not save the confirmation. Please retry.');
      }
      setDisputing(false);
      notify(action === 'confirm-work'
        ? 'Work confirmed. Your booking is complete. You can now review the workshop.'
        : 'Dispute opened. An administrator has been notified for review.');
      if (action === 'confirm-work') setShowRating(true);
    } catch (cause: any) {
      setError(cause?.message || 'Could not confirm this repair. The booking has not been completed.');
      if (live && (cause?.status === 409 || cause?.status === 412)) refresh();
    } finally { setBusy(false); }
  }

  async function submitReview(rating: number, comment: string) {
    setReviewBusy(true); setReviewError('');
    try {
      if (live) {
        await api('/bookings/' + encodeURIComponent(job.id) + '/review', 'PUT', { rating, body: comment });
        refresh();
      } else {
        const result = await update((current: any) => saveCustomerReview(current, {
          customerId, professionalId: job.professionalId, bookingId: job.id,
          rating, text: comment, reviewId: reviewed?.id,
        }));
        if (result === false) throw Error('The review could not be saved.');
      }
      setShowRating(false);
      notify('Your review has been saved to the workshop profile.');
    } catch (cause: any) {
      setReviewError(cause?.message || 'Could not save your review. Please try again.');
    } finally { setReviewBusy(false); }
  }

  if (job.status === 'Awaiting confirmation') return (
    <div className="service-confirmation-card" aria-label="Confirm completed repairs">
      <div className="service-confirmation-head">
        <ShieldCheck size={22} aria-hidden="true"/>
        <div><strong>Confirm your vehicle repair</strong>
          <p>The workshop says the approved work is done. Review the service report under Activity history before deciding.</p>
        </div>
      </div>
      <div className="service-confirmation-actions">
        <button className="primary" disabled={busy} type="button" onClick={() => void act('confirm-work')}>
          <CheckCircle2 size={17}/> {busy ? 'Confirming…' : 'Confirm work done'}
        </button>
        <button className="secondary service-dispute-button" disabled={busy} type="button" onClick={() => setDisputing((value) => !value)}>
          <ShieldAlert size={17}/> Report a problem
        </button>
      </div>
      {disputing && <div className="service-dispute-form">
        <label htmlFor={'dispute-' + job.id}>Explain what is incomplete or incorrect</label>
        <textarea id={'dispute-' + job.id} rows={4} maxLength={2000}
          value={reason} onChange={(event) => setReason(event.target.value)}
          placeholder="Describe the repairs or issues that need administrator review…"/>
        <button className="secondary service-dispute-button" type="button" disabled={busy || reason.trim().length < 10}
          onClick={() => void act('dispute-work')}>Open dispute for admin review</button>
      </div>}
      <p className="service-funds-notice"><Wallet size={15}/> Completion is recorded for testing. No escrow funds are released or transferred.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );

  if (job.status === 'Disputed') return (
    <div className="service-confirmation-card is-disputed">
      <strong><ShieldAlert size={18}/> Dispute under admin review</strong>
      <p>{job.disputeReason || 'Your dispute is recorded.'}</p>
      <p>No provider payout is authorised. The administrator must record a decision.</p>
      {job.disputeResolution && <p>Admin decision: {job.disputeResolution}</p>}
    </div>
  );
  if (job.status !== 'Completed') return null;

  return (
    <>
      <div className="service-confirmation-card is-complete">
        <strong><CheckCircle2 size={18}/> Repairs completed</strong>
        <p>The booking is complete. No real escrow payout was made.
          {reviewed ? ' Your workshop review is recorded.' : ' You can now rate the workshop.'}</p>
        {reviewed && <p className="service-rating-existing"><Star size={16} fill="currentColor"/> {reviewed.rating}/5 · {reviewed.text || reviewed.body}</p>}
        <button className="primary" type="button" onClick={() => {
          setReviewError(''); setShowRating(true);
        }}>{reviewed ? 'Edit your review' : 'Rate your workshop'}</button>
      </div>
      {showRating && <RatingDialog
        bookingId={job.id} workshop={job.provider} initial={reviewed}
        busy={reviewBusy} error={reviewError} onSave={submitReview}
        onClose={() => { if (!reviewBusy) { setShowRating(false); setReviewError(''); } }}
      />}
    </>
  );
}
