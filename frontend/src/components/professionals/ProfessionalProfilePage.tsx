import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { RoadLoader } from '../ui/RoadLoader';
import { demoCustomerId } from '../../features/admin/customerRecords';
import { customerRecords } from '../../features/admin/customerRecords';
import { readProfilePhoto } from '../../features/account/profilePhoto';
import { initialsFromName } from '../../features/account/customerIdentity';
import { resolveProfessional, verificationCopy } from '../../features/professionals/professionalProfile';
import {
  deleteCustomerReview,
  eligibleReviewBookings,
  reviewsForProfessional,
  saveCustomerReview,
} from '../../features/reviews/customerReviews';

function stars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (index < rating ? '★' : '☆')).join('');
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
  const reviews = resolved.state === 'listed' ? reviewsForProfessional(data, professionalId) : [];
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

  if (resolved.state === 'missing') {
    return (
      <Tag className="section profile-page">
        <Card as="section" className="dash-panel">
          <h1>Professional not found</h1>
          <p>This profile link does not match a professional in this browser preview.</p>
          <button className="secondary" type="button" onClick={() => go(embedded ? 'dashboard/find' : 'find')}>
            Back to professionals
          </button>
        </Card>
      </Tag>
    );
  }

  if (resolved.state === 'unavailable') {
    return (
      <Tag className="section profile-page">
        <Card as="section" className="dash-panel">
          <span className="chip">UNAVAILABLE</span>
          <h1>{resolved.name || 'Professional unavailable'}</h1>
          <p>
            This professional is not available to book
            {resolved.applicationStatus ? ` (${resolved.applicationStatus})` : ''}. Sample directory
            status only. No private documents are shown.
          </p>
          <button className="secondary" type="button" onClick={() => go(embedded ? 'dashboard/find' : 'find')}>
            Back to professionals
          </button>
        </Card>
      </Tag>
    );
  }

  const profile = resolved.profile;
  const ownReview = reviews.find((review: any) => review.customerId === customerId);

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

  return (
    <Tag className={'section profile-page' + (embedded ? ' profile-embedded' : '')}>
      <section className="pro-banner">
        <div className="pro-banner-art" aria-hidden="true">
          {profile.photo ? <img src={profile.photo} alt="" /> : <span>{initialsFromName(profile.name)}</span>}
        </div>
        <div>
          {profile.sample ? <span className="chip">SAMPLE PROFILE</span> : null}
          <h1>{profile.name}</h1>
          {profile.individualName ? <p>{profile.individualName}</p> : null}
          <p>
            <MapPin size={16} aria-hidden="true" /> {profile.area} · {profile.type}
          </p>
          <button
            className="primary"
            type="button"
            onClick={() =>
              book({
                id: profile.id,
                name: profile.name,
                area: profile.area,
                type: profile.type,
                fee: profile.fee,
                special: profile.services.join(' · '),
              })
            }
          >
            Book assessment <ArrowRight size={18} />
          </button>
        </div>
      </section>
      <div className="pro-layout">
        <Card as="section" className="dash-panel">
          <h2>About</h2>
          <p>{profile.bio || (profile.sample ? 'Sample profile. No about text has been recorded.' : 'No about text has been recorded.')}</p>
          <h2>Services offered</h2>
          {profile.services.length ? (
            <ul className="pro-services">
              {profile.services.map((service: string) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          ) : (
            <p>No services have been recorded.</p>
          )}
          <div className="fee-row">
            <span>Assessment fee</span>
            <strong>R{profile.fee}</strong>
          </div>
          <p className="muted">Repair costs are quoted separately after the assessment.</p>
        </Card>
        <Card as="section" className="dash-panel">
          <h2>Contact</h2>
          {profile.phone || profile.email || profile.website ? (
            <ul className="pro-contact">
              {profile.phone ? <li>{profile.phone}</li> : null}
              {profile.email ? <li>{profile.email}</li> : null}
              {profile.website ? (
                <li>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p>No public phone, email, or website has been recorded.</p>
          )}
          <h2>Verification</h2>
          <div className="notice">
            <ShieldCheck size={20} aria-hidden="true" />
            <p>{verificationCopy(profile)}</p>
          </div>
        </Card>
      </div>
      <Card as="section" className="dash-panel">
        <h2>Customer reviews</h2>
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
                <p>{review.text}</p>
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
                          const saved = update((current: any) =>
                            deleteCustomerReview(current, review.id, customerId),
                          );
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
        {ownReview && role !== 'customer' ? null : null}
      </Card>
    </Tag>
  );
}
