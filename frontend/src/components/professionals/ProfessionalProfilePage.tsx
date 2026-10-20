import { useLayoutEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { DetailBack, DetailCard } from '../ui/DetailChrome';
import { RoadLoader } from '../ui/RoadLoader';
import { demoCustomerId } from '../../features/admin/customerRecords';
import { customerRecords } from '../../features/admin/customerRecords';
import { readProfilePhoto } from '../../features/account/profilePhoto';
import { initialsFromName } from '../../features/account/customerIdentity';
import { resolveProfessional, verificationCopy } from '../../features/professionals/professionalProfile';
import { formatDay } from '../../features/jobs/bookingProgress';
import { backTarget, returnLabel } from '../../features/navigation/returnPath';
import { chargeConfirmation } from '../../features/jobs/pricingModel';
import { distanceFor } from '../../features/professionals/discovery';
import { readDiscoverySession } from '../../features/professionals/discoveryState';
import { approximateDistanceLabel, mapsDirectionsUrl } from '../../features/professionals/geo';
import {
  deleteCustomerReview,
  eligibleReviewBookings,
  saveCustomerReview,
} from '../../features/reviews/customerReviews';
import { eligibleCustomerReviews, ratingSummary } from '../../features/reviews/ratingSummary';
import { RatingLine } from './RatingLine';

function stars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (index < rating ? '★' : '☆')).join('');
}

function ReviewCopy({ text }: { text: string }) {
  if (!text) return <p>No written review was saved.</p>;
  if (text.length <= 180) return <p>{text}</p>;
  return (
    <details className="fold">
      <summary>Read full review</summary>
      <p>{text}</p>
    </details>
  );
}

export function ProfessionalProfilePage({
  professionalId,
  data,
  embedded = false,
  role,
  book,
  go,
  update,
  notify,
}: any) {
  const resolved = resolveProfessional(professionalId, data);
  const Tag = embedded ? 'div' : 'main';
  const customerId = data?.settings?.id || demoCustomerId;
  const reviews = resolved.state === 'listed' ? eligibleCustomerReviews(data, professionalId) : [];
  const eligible =
    role === 'customer' && resolved.state === 'listed'
      ? eligibleReviewBookings(data, customerId, professionalId)
      : [];
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [bookingId, setBookingId] = useState(eligible[0]?.id || '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [editing, setEditing] = useState('');
  const [photoState, setPhotoState] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState('');
  const customers = customerRecords(data);
  const here = (embedded ? 'dashboard/find/' : 'professional/') + encodeURIComponent(professionalId || '');
  const fallback = embedded ? 'dashboard/find' : 'find';
  const back = backTarget(here, fallback);

  useLayoutEffect(() => {
    if (!embedded) return;
    const scroller = document.querySelector('.workspace-main');
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
  }, [embedded, professionalId]);

  if (resolved.state === 'missing') {
    return (
      <Tag className="section profile-page detail-page">
        <DetailBack label={returnLabel(back)} onClick={() => go(back)} />
        <Card as="section" className="dash-panel">
          <h1>Professional not found</h1>
          <p>This profile link does not match a professional in this browser preview.</p>
        </Card>
      </Tag>
    );
  }

  if (resolved.state === 'unavailable') {
    return (
      <Tag className="section profile-page detail-page">
        <DetailBack label={returnLabel(back)} onClick={() => go(fallback)} />
        <Card as="section" className="dash-panel">
          <span className="chip">UNAVAILABLE</span>
          <h1>{resolved.name || 'Professional unavailable'}</h1>
          <p>
            This professional is not available to book
            {resolved.applicationStatus ? ` (${resolved.applicationStatus})` : ''}. Sample directory
            status only. No private documents are shown.
          </p>
        </Card>
      </Tag>
    );
  }

  const profile = resolved.profile;

  async function addPhoto(file: File) {
    setPhotoState('working');
    setError('');
    try {
      const photo = await readProfilePhoto(file);
      setPhotos((current) => [...current, photo].slice(0, 3));
    } catch (reason: any) {
      setError(reason?.message || 'This image could not be read.');
    } finally {
      setPhotoState('idle');
    }
  }

  function submitReview(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = update((current: any) =>
        saveCustomerReview(current, {
          customerId,
          professionalId,
          bookingId,
          rating,
          text,
          photos,
          reviewId: editing || undefined,
        }),
      );
      if (!saved) {
        notify('Could not store this review in this browser.');
        return;
      }
      setEditing('');
      setText('');
      setPhotos([]);
      notify('Demo review saved in this browser.');
    } catch (reason: any) {
      setError(reason?.message || 'The review could not be saved.');
    }
  }

  const summary = ratingSummary(data, professionalId);
  const discovery = readDiscoverySession();
  const distance = distanceFor({ location: profile.location }, discovery.origin);
  const coverage = Number(profile.location?.serviceRadiusKm);
  const distanceLabel =
    profile.location?.precision === 'service-area' && distance != null && Number.isFinite(coverage) && distance <= coverage
      ? 'Serves your area'
      : distance != null && profile.location && profile.location.precision !== 'unknown' && profile.location.precision !== 'service-area'
        ? approximateDistanceLabel(distance, profile.location.precision)
        : '';
  const directions = mapsDirectionsUrl(profile.location);

  return (
    <Tag className={'section profile-page detail-page' + (embedded ? ' profile-embedded' : '')}>
      <DetailBack label={returnLabel(back)} onClick={() => go(back)} />
      <section className="pro-banner">
        <div className="pro-banner-art">
          {profile.photo ? (
            <img src={profile.photo} alt="Illustrative workshop photograph. Not a picture of this fictional business." />
          ) : (
            <span aria-hidden="true">{initialsFromName(profile.name)}</span>
          )}
        </div>
        <div>
          {profile.sample ? <span className="chip">SAMPLE PROFILE</span> : null}
          <h1>{profile.name}</h1>
          {profile.individualName ? <p>{profile.individualName}</p> : null}
          <p>
            <MapPin size={16} aria-hidden="true" /> {profile.place || profile.area || 'Location not recorded'} · {profile.type || 'Type not recorded'}
          </p>
          {profile.location?.precision === 'service-area' ? (
            <p>Service-area reference only. This is not a live location or a private base address.</p>
          ) : null}
          {profile.location?.precision === 'area-centre' ? (
            <p>Listed from a demo area centre, not a geocoded street address.</p>
          ) : null}
          <p>
            <ShieldCheck size={16} aria-hidden="true" /> {verificationCopy(profile)}
          </p>
          <RatingLine summary={summary} />
          {distanceLabel ? <p>{distanceLabel}</p> : null}
          <p>{chargeConfirmation}</p>
          <div className="button-row">
          <button
            className="primary"
            type="button"
            onClick={() =>
              book({
                id: profile.id,
                name: profile.name,
                area: profile.area,
                type: profile.type,
                special: profile.services.join(' · '),
              })
            }
          >
            Book assessment <ArrowRight size={18} />
          </button>
          {directions ? (
            <a className="text-link directions-link" href={directions} target="_blank" rel="noopener noreferrer">
              Directions <ArrowUpRight size={16} />
            </a>
          ) : null}
          </div>
        </div>
      </section>
      <div className="pro-profile-content">
        <div className="detail-main">
          <Card as="section" className="pro-information dash-panel">
            <section className="pro-information-section">
              <h2>About</h2>
              {profile.bio && profile.bio.length > 320 ? (
                <div><p>{profile.bio.slice(0, 320)}…</p><details className="pro-about-more"><summary>Read full introduction</summary><p>{profile.bio}</p></details></div>
              ) : <p>{profile.bio || 'This professional has not added an introduction yet.'}</p>}
            </section>
            <section className="pro-information-section">
              <h2>Services</h2>
              {profile.services.length ? (
                <ul className="pro-service-tags">{profile.services.map((service: string) => <li key={service}>{service}</li>)}</ul>
              ) : <p>No services have been recorded.</p>}
            </section>
            <section className="pro-information-section">
              <h2>Contact</h2>
            {profile.phone || profile.email || profile.website ? (
              <ul className="pro-contact">
                {profile.phone ? (
                  <li>
                    <a href={'tel:' + profile.phone}>{profile.phone}</a>
                  </li>
                ) : null}
                {profile.email ? (
                  <li>
                    <a href={'mailto:' + profile.email}>{profile.email}</a>
                  </li>
                ) : null}
                {profile.website ? (
                  <li>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer">
                      Website
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p>No public phone, email, or website has been recorded.</p>
            )}
            </section>
          </Card>
          <DetailCard title="Customer reviews">
            {reviews.length ? (
              reviews.map((review: any) => {
                const mine = review.customerId === customerId;
                const name = mine
                  ? 'You'
                  : customers.find((customer) => customer.id === review.customerId)?.name || 'Customer';
                return (
                  <article key={review.id} className="review-card">
                    <p>
                      <Star size={16} aria-hidden="true" /> <span className="visually-hidden">Rating</span>
                      {stars(review.rating)} · {name}
                    </p>
                    <p className="muted">{review.createdAt ? formatDay(review.createdAt) : 'Date not recorded'}</p>
                    <ReviewCopy text={review.text} />
                    {review.photos?.length ? (
                      <div className="review-photos">
                        {review.photos.map((photo: string) => (
                          <img key={photo.slice(-24)} src={photo} alt="" />
                        ))}
                      </div>
                    ) : null}
                    {mine && role === 'customer' ? (
                      <div className="button-row">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            setEditing(review.id);
                            setBookingId(review.bookingId);
                            setRating(review.rating);
                            setText(review.text);
                            setPhotos(review.photos || []);
                          }}
                        >
                          Edit review
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            try {
                              const saved = update((current: any) => deleteCustomerReview(current, review.id, customerId));
                              notify(
                                saved
                                  ? 'Demo review removed from this browser.'
                                  : 'Could not store this change in this browser.',
                              );
                            } catch (reason: any) {
                              notify(reason.message);
                            }
                          }}
                        >
                          Delete review
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p>No reviews yet</p>
            )}
            {role === 'customer' && eligible.length ? (
              <form className="review-form" onSubmit={submitReview}>
                <h3>{editing ? 'Edit your review' : 'Add a review'}</h3>
                <p className="muted">Only a completed booking you own with this professional can be reviewed.</p>
                <label>
                  Booking
                  <select value={bookingId} onChange={(event) => setBookingId(event.target.value)} disabled={!!editing}>
                    {eligible.map((job: any) => (
                      <option key={job.id} value={job.id}>
                        {job.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Rating
                  <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Review
                  <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} required />
                </label>
                <label>
                  Photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void addPhoto(file);
                    }}
                  />
                </label>
                {photoState === 'working' ? <RoadLoader label="Preparing review photo" /> : null}
                {error ? (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button className="primary" type="submit" disabled={photoState === 'working'}>
                  Save review
                </button>
              </form>
            ) : null}
          </DetailCard>
        </div>

      </div>
    </Tag>
  );
}
