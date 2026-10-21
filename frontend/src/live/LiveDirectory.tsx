import { useState } from 'react';
import { DetailBack, DetailCard, DetailFields } from '../components/ui/DetailChrome';
import { RoadLoader } from '../components/ui/RoadLoader';
import { useResource } from './useResource';
import { api } from './api';
export function LiveDirectory({ professionalId, user, revision, run, go }: any) {
  const [city, setCity] = useState(''),
    [type, setType] = useState(''),
    [booking, setBooking] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const { data, error } = useResource(
    professionalId
      ? `/professionals/${professionalId}`
      : `/professionals?${new URLSearchParams({ ...(city ? { city } : {}), ...(type ? { type } : {}) })}`,
    revision,
  );
  const { data: vehicles } = useResource(
    booking && user?.role === 'CUSTOMER' ? '/vehicles' : null,
    revision,
  );
  if (error) return <p role="alert">{error}</p>;
  const select = (pro: any) => {
    if (!user) {
      sessionStorage.setItem('verifi-pending-professional', pro.id);
      go('login');
      return;
    }
    setBooking(pro);
    setRequestId(crypto.randomUUID());
  };
  return (
    <div className="detail-page">
      {professionalId ? (
        <DetailBack
          label="Back to professionals"
          onClick={() => go(user ? 'dashboard/find' : 'find')}
        />
      ) : (
        <>
          <h1>Find a professional</h1>
          <div className="live-filters">
            <label>
              City
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search any city"
              />
            </label>
            <label>
              Professional
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All professionals</option>
                <option>Workshop</option>
                <option>Mobile mechanic</option>
              </select>
            </label>
          </div>
        </>
      )}
      {!data ? (
        <RoadLoader label="Finding verified professionals…" />
      ) : professionalId ? (
        <>
          <DetailCard title={data.name}>
            <DetailFields
              items={[
                { label: 'Professional', value: data.type },
                { label: 'Location', value: data.city },
                { label: 'Contact', value: data.phone },
                { label: 'Credential', value: data.credentialId },
              ]}
            />
            <p>{data.about}</p>
            <h3>Services</h3>
            <p>{data.services.join(' · ')}</p>
            {!user || user.role === 'CUSTOMER' ? (
              <button className="primary" onClick={() => select(data)}>
                Book assessment
              </button>
            ) : null}
          </DetailCard>
          <DetailCard title="Customer reviews">
            {data.reviews?.length ? (
              data.reviews.map((review: any) => (
                <article key={review.id}>
                  <strong>
                    {review.customerName} · {review.rating}/5
                  </strong>
                  <p>{review.body}</p>
                </article>
              ))
            ) : (
              <p>No reviews yet.</p>
            )}
          </DetailCard>
        </>
      ) : (
        <div className="live-card-grid">
          {data.map((pro: any) => (
            <DetailCard key={pro.id} title={pro.name}>
              <p>
                {pro.type} · {pro.city}
              </p>
              <p>
                {pro.rating
                  ? `${pro.rating.toFixed(1)}/5 · ${pro.reviewCount} reviews`
                  : 'No reviews yet'}
              </p>
              <p>{pro.services.slice(0, 4).join(' · ')}</p>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => go((user ? 'dashboard/find/' : 'professional/') + pro.id)}
                >
                  View profile
                </button>
                {!user || user.role === 'CUSTOMER' ? (
                  <button className="primary" onClick={() => select(pro)}>
                    Book assessment
                  </button>
                ) : null}
              </div>
            </DetailCard>
          ))}
          {!data.length ? <p>No approved professionals match this location yet.</p> : null}
        </div>
      )}
      {booking ? (
        <DetailCard title={`Book ${booking.name}`}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              const values = Object.fromEntries(new FormData(event.currentTarget));
              await run(async () => {
                const job = await api('/bookings', 'POST', {
                  ...values,
                  professionalId: booking.id,
                  appointmentAt: new Date(String(values.appointmentAt)).toISOString(),
                  clientRequestId: requestId,
                });
                setBooking(null);
                go('dashboard/bookings/' + job.id);
              }, 'Booking request sent.');
              setBusy(false);
            }}
          >
            <label>
              Vehicle
              <select name="vehicleId" required>
                <option value="">Choose your car</option>
                {vehicles?.map((vehicle: any) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} · {vehicle.registration}
                  </option>
                ))}
              </select>
            </label>
            {vehicles?.length === 0 ? (
              <button type="button" className="text-link" onClick={() => go('dashboard/garage')}>
                Add a vehicle first
              </button>
            ) : null}
            <label>
              Preferred appointment
              <input name="appointmentAt" type="datetime-local" required />
            </label>
            <label>
              What needs attention?
              <textarea name="description" minLength={3} maxLength={4000} required />
            </label>
            <div className="button-row">
              <button className="primary" disabled={busy || !vehicles?.length}>
                {busy ? 'Sending…' : 'Request assessment'}
              </button>
              <button className="secondary" type="button" onClick={() => setBooking(null)}>
                Cancel
              </button>
            </div>
          </form>
        </DetailCard>
      ) : null}
    </div>
  );
}
