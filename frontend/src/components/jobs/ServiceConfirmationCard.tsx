import { useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, Star, Wallet } from 'lucide-react';
import { applyJobTransition } from '../../features/demo/demoActions';
import { saveCustomerReview } from '../../features/reviews/customerReviews';

/** Customer-controlled service acceptance. Neither acceptance nor dispute sends money:
 * funds may only be released through a separately integrated, verified escrow PSP.
 */
export function ServiceConfirmationCard({ job, customerId, data, update, notify }: any) {
  const [reason, setReason] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const reviewed = (data.customerReviews || []).find((item: any) => item.bookingId === job.id);

  async function act(action: 'confirm-work' | 'dispute-work') {
    if (busy) return;
    if (action === 'confirm-work' && !window.confirm(
      'Confirm the workshop completed the approved repairs? This records your acceptance but does not transfer funds.'
    )) return;
    if (action === 'dispute-work' && reason.trim().length < 10) {
      setError('Please explain the problem in at least 10 characters.');
      return;
    }
    setBusy(true); setError('');
    try {
      await update((current: any) => applyJobTransition(current, job, action,
        action === 'dispute-work' ? { reason: reason.trim() } : {},
        { role: 'customer', id: customerId }).data);
      notify(action === 'confirm-work'
        ? 'Work confirmed. The booking is complete; you can now rate the workshop.'
        : 'Dispute opened. An administrator has been notified for review.');
      setDisputing(false);
    } catch (cause: any) {
      setError(cause?.message || 'Could not update this booking.');
    } finally { setBusy(false); }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await update((current: any) => saveCustomerReview(current, {
        customerId, professionalId: job.professionalId, bookingId: job.id,
        rating, text: comment, reviewId: reviewed?.id,
      }));
      notify('Your rating and feedback have been saved.');
    } catch (cause: any) { setError(cause?.message || 'Could not save your review.'); }
    finally { setBusy(false); }
  }

  if (job.status === 'Awaiting confirmation') return (
    <div className="service-confirmation-card" aria-label="Confirm completed repairs">
      <div className="service-confirmation-head">
        <ShieldCheck size={22} aria-hidden="true"/>
        <div><strong>Confirm your vehicle repair</strong><p>The workshop says the approved work is done. Review the service report under Activity history before deciding.</p></div>
      </div>
      <div className="service-confirmation-actions">
        <button className="primary" disabled={busy} type="button" onClick={() => void act('confirm-work')}>
          <CheckCircle2 size={17}/> Confirm work done
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
      <p className="service-funds-notice"><Wallet size={15}/> Payments and escrow transfers are not connected. Confirmation does not trigger a payout.</p>
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
    <div className="service-confirmation-card is-complete">
      <strong><CheckCircle2 size={18}/> Repairs confirmed</strong>
      <p>Your booking is complete. {reviewed ? 'Your review is recorded below.' : 'Share your experience with this workshop.'}</p>
      <form className="service-review-form" onSubmit={(event) => void submitReview(event)}>
        <fieldset><legend>Rate this workshop</legend>
          <div className="service-stars" role="radiogroup" aria-label="Workshop rating">
            {[1,2,3,4,5].map((n) => <label key={n}>
              <input type="radio" name={'rating-' + job.id} required value={n}
                checked={rating === n} onChange={() => setRating(n)}/>
              <Star size={23} fill={n <= rating ? 'currentColor' : 'none'}/><span className="visually-hidden">{n} stars</span>
            </label>)}
          </div>
        </fieldset>
        <label>Tell other drivers about the service
          <textarea rows={3} minLength={8} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)}
            placeholder="What did the workshop do well? What could improve?" required/>
        </label>
        {reviewed && <p className="muted">Previous review: {reviewed.rating}/5 · {reviewed.text || reviewed.body}</p>}
        <button className="primary" disabled={busy || rating < 1 || comment.trim().length < 8} type="submit">
          {reviewed ? 'Update rating and review' : 'Submit rating and review'}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
