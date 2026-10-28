import { bookingReference } from '../../features/jobs/jobViews';
import { Card } from '../ui/Card';
import { StatusBadge as Status } from '../ui/StatusBadge';
import { ArrowRight, Car, Calendar, Siren, MapPin } from 'lucide-react';
import { quoteTotal } from '../../features/jobs/jobWorkflow';
import { formatDay } from '../../features/jobs/bookingProgress';

function VehicleArt({ image }: { image: string }) {
  if (image) return <img src={image} alt="" />;
  return (
    <svg className="garage-card-silhouette" viewBox="0 0 200 96" aria-hidden="true">
      <path d="M34 58h132c6 0 10 4 10 8v2H24v-2c0-4 4-8 10-8z" />
      <path d="M52 58 70 38c2-3 6-6 10-6h48c5 0 9 2 12 6l16 20" />
      <circle cx="68" cy="70" r="8" />
      <circle cx="138" cy="70" r="8" />
    </svg>
  );
}

export function JobCard({
  job: j,
  onView,
  quoteAction,
  registration = '',
  viewLabel = 'View details',
  image = '',
  audience = '',
  person = '',
  attention = 0,
  review = null,
}: any) {
  const completed = String(j.status).toLowerCase() === 'completed';
  const reviewed = completed && review && Number(review.rating) >= 1 && Number(review.rating) <= 5;
  const ratingLabel = reviewed ? `Customer rating: ${review.rating}/5 stars` : '';
  const ratingLine = reviewed ? (
    <span className="completed-job-rating" aria-label={ratingLabel} style={{ color: 'var(--brand, #9658e8)', fontWeight: 700 }}>
      {'★'.repeat(Number(review.rating))}{'☆'.repeat(5 - Number(review.rating))} · {review.rating}/5
    </span>
  ) : null;
  const vehicleName = j.vehicleLabel || j.vehicle || 'Vehicle not recorded';
  const when = `${j.date ? formatDay(j.date) : 'Date not recorded'}${j.time ? ` at ${j.time}` : ''}`;
  const professional = j.provider || 'Professional not recorded';
  const quoteAmount = j.items?.length ? `R${quoteTotal(j).toLocaleString()}` : '';

  if (audience === 'mechanic') {
    return (
      <Card as="article" className={"job-card booking-card mechanic-job-card" + (j.kind === 'EMERGENCY' ? " roadside-alert-card" : "") + (attention ? ' needs-attention' : '')}>
        <button
          type="button"
          className="booking-card-hit"
          onClick={onView}
          aria-label={`Open job ${bookingReference(j)}, ${vehicleName}`}
        >
          <span className="booking-card-art">
            <VehicleArt image={image} />
          </span>
          <span className="booking-card-copy">
            {j.kind === 'EMERGENCY' && <span className="roadside-card-badge"><Siren size={15} /> EMERGENCY JOB</span>}
            <strong>{vehicleName}</strong>
            <span>{person || 'Customer not recorded'}</span>
            <span>{when}</span>
            {j.kind === 'EMERGENCY' && <span className="roadside-card-location"><MapPin size={13}/>{j.roadsideAddress || 'Roadside location in request'}</span>}
            {registration ? <span>{registration}</span> : null}
            <span className="reference">{bookingReference(j)}</span>
            {ratingLine}
            {quoteAmount ? <span className="mechanic-job-amount">Quote {quoteAmount}</span> : null}
          </span>
          <Status value={j.status} />
          {attention > 0 && <span className="booking-attention-dot" title="Unread booking update" aria-label="Unread booking update" />}
          <ArrowRight className="booking-card-arrow" size={18} aria-hidden="true" />
        </button>
      </Card>
    );
  }

  if (!quoteAction) {
    return (
      <Card as="article" className={"job-card booking-card" + (j.kind === 'EMERGENCY' ? " roadside-alert-card" : "") + (attention ? ' needs-attention' : '')}>
        <button type="button" className="booking-card-hit" onClick={onView} aria-label={`${viewLabel}, ${vehicleName}`}>
          <span className="booking-card-art">
            <VehicleArt image={image} />
          </span>
          <span className="booking-card-copy">
            {j.kind === 'EMERGENCY' && <span className="roadside-card-badge"><Siren size={15}/> EMERGENCY</span>}
            <strong>{vehicleName}</strong>
            <span>{professional}</span>
            <span>{when}</span>
            {ratingLine}
          </span>
          <Status value={j.status} />
          {attention > 0 && <span className="booking-attention-dot" title="Unread booking update" aria-label="Unread booking update" />}
          <ArrowRight className="booking-card-arrow" size={18} aria-hidden="true" />
        </button>
        {j.rejectionReason ? (
          <p className="booking-card-note">
            <b>Rejection reason:</b> {j.rejectionReason}
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card as="article" className="job-card">
      <div className="job-card-top">
        <span className="reference">{bookingReference(j)}</span>
        <Status value={j.status} />
      </div>
      <h3>{vehicleName}</h3>
      {ratingLine}
      {registration ? <p className="job-registration">{registration}</p> : null}
      <p>
        <Car size={15} aria-hidden="true" />
        {professional}
      </p>
      <p>
        <Calendar size={15} aria-hidden="true" />
        {when}
      </p>
      {j.rejectionReason ? (
        <p>
          <b>Rejection reason:</b> {j.rejectionReason}
        </p>
      ) : null}
      <div className="job-card-bottom">
        <span>
          {j.items?.length ? 'Quotation' : 'Quotation'}
          <b>{j.items?.length && Number.isFinite(quoteTotal(j)) ? `R${quoteTotal(j).toLocaleString()}` : 'Not sent yet'}</b>
        </span>
        <span className="job-card-actions">
          <button className="text-link" type="button" onClick={quoteAction.onClick}>
            {quoteAction.label} <ArrowRight size={16} />
          </button>
          <button className="text-link" type="button" onClick={onView}>
            {viewLabel} <ArrowRight size={16} />
          </button>
        </span>
      </div>
    </Card>
  );
}
