import { Wrench, MapPin, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { emptyRating } from '../../features/reviews/ratingSummary';
import { Card } from '../ui/Card';
import { RatingLine } from './RatingLine';

export function ProfessionalCard({ professional: p, onView, onBook }: any) {
  const rating = p.rating || emptyRating;
  const photo = typeof p.photo === 'string' ? p.photo : '';
  const directions = typeof p.directionsUrl === 'string' ? p.directionsUrl : '';
  const place = p.place || p.area || 'Location not recorded';
  return (
    <Card as="article" className="provider-card">
      <div className="provider-body">
        <div className="provider-art">
          {photo ? (
            <img
              src={photo}
              alt={
                p.sample === false
                  ? p.name + ' profile photo'
                  : 'Illustrative workshop photograph. Not a picture of this fictional business.'
              }
            />
          ) : (
            <Wrench size={56} aria-hidden="true" />
          )}
        </div>
        <div className="provider-info">
          <div className="provider-kicker">
            <span className="provider-type">{p.type}</span>
            {p.sample !== false ? <span className="chip">SAMPLE PROFILE</span> : null}
          </div>
          <h2>{p.name}</h2>
          <p className="provider-place">
            <MapPin size={15} aria-hidden="true" />
            {place}
          </p>
          {p.special ? <p className="provider-special">{p.special}</p> : null}
          <div className="verification">
            <ShieldCheck size={16} aria-hidden="true" />
            {p.verification || 'Sample profile. Not a verified business.'}
          </div>
        </div>
      </div>
      <div className="provider-card-footer">
        <div className="provider-card-reputation">
          <RatingLine summary={rating} />
          {p.distanceLabel && p.distanceLabel !== 'Distance unavailable' ? (
            <p className="provider-distance">{p.distanceLabel}</p>
          ) : null}
        </div>
        <div className="provider-actions">
          <button className="secondary view-profile" type="button" onClick={onView}>
            View profile <ArrowUpRight size={14} />
          </button>
          {onBook ? (
            <button className="primary" type="button" onClick={onBook}>
              Book assessment <ArrowUpRight size={16} />
            </button>
          ) : null}
          {directions ? (
            <a
              className="text-link directions-link"
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions <ArrowUpRight size={14} />
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
