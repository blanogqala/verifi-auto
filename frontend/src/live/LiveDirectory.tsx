import { useEffect, useState } from 'react';
import { MapPin, ShieldCheck, ArrowRight, ArrowUpRight } from 'lucide-react';
import { ProfessionalsPage } from '../pages/public/ProfessionalsPage';
import { Card } from '../components/ui/Card';
import { RatingLine } from '../components/professionals/RatingLine';
import { DetailBack, DetailCard } from '../components/ui/DetailChrome';
import { RoadLoader } from '../components/ui/RoadLoader';
import { defaultDiscovery, type DiscoverySession } from '../features/professionals/discovery';
import {
  coordinatesOf,
  haversineKm,
  approximateDistanceLabel,
} from '../features/professionals/geo';
import { initialsFromName } from '../features/account/customerIdentity';
import { useResource } from './useResource';
import { LiveDialog } from './LiveDialog';
import { api } from './api';

export function directoryCard(pro: any, origin: any) {
  const point = coordinatesOf(pro.latitude, pro.longitude);
  const distance = origin && point ? haversineKm(origin, point) : null;
  const average = pro.rating ?? null,
    count = pro.reviewCount || 0;
  return {
    ...pro,
    sample: false,
    photo: pro.photo || '',
    place: pro.city,
    special: pro.services.join(' · '),
    verification: 'Credentials reviewed by Verifi Auto',
    rating: {
      average,
      count,
      label: `${average?.toFixed(1) || '0'}/5 · ${count} reviews`,
      accessible: `${average || 0} out of 5 from ${count} reviews`,
    },
    distanceLabel: distance == null ? '' : approximateDistanceLabel(distance, 'public-premises'),
    sortKm: distance ?? Infinity,
    directionsUrl:
      pro.type === 'Workshop' && point
        ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}&travelmode=driving`
        : '',
  };
}
export function LiveDirectory({ professionalId, user, revision, run, go, embedded = false }: any) {
  const [discovery, setDiscovery] = useState<DiscoverySession>(defaultDiscovery);
  const [booking, setBooking] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(''),
    [previous, setPrevious] = useState<any[]>([]);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const params = new URLSearchParams({
    take: '100',
    ...(cursor ? { cursor } : {}),
    ...(!['All services', 'Not sure yet', ''].includes(discovery.service)
      ? { service: discovery.service }
      : {}),
    ...(discovery.type !== 'Either' ? { type: discovery.type } : {}),
  });
  const { data, error } = useResource(
    professionalId ? `/professionals/${professionalId}` : `/professionals?${params}`,
    revision,
  );
  const { data: vehicles, error: vehicleError } = useResource(
    booking && user?.role === 'CUSTOMER' ? '/vehicles' : null,
    revision,
  );
  const select = (pro: any) => {
    if (!user) {
      sessionStorage.setItem('verifi-pending-professional', pro.id);
      go('login');
      return;
    }
    if (user.role !== 'CUSTOMER') return;
    setBooking(pro);
    setRequestId(crypto.randomUUID());
  };
  useEffect(() => {
    const pending = sessionStorage.getItem('verifi-resume-assessment');
    if (professionalId && data?.id === pending && user?.role === 'CUSTOMER') {
      sessionStorage.removeItem('verifi-resume-assessment');
      select(data);
    }
  }, [professionalId, data?.id, user?.id]);
  const results = [...previous, ...(Array.isArray(data) ? data : [])]
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .map((pro) => directoryCard(pro, discovery.origin))
    .sort((a, b) => a.sortKm - b.sortKm || a.name.localeCompare(b.name));
  const changeFilter = (key: 'service' | 'type', value: string) => {
    setCursor('');
    setPrevious([]);
    setDiscovery((current) => ({ ...current, [key]: value }));
  };
  const canBook = !user || user.role === 'CUSTOMER';
  return (
    <>
      {professionalId ? (
        <div className={'section profile-page detail-page' + (embedded ? ' profile-embedded' : '')}>
          <DetailBack
            label="Back to professionals"
            onClick={() => go(embedded ? 'dashboard/find' : 'find')}
          />
          {error ? (
            <p role="alert">{error}</p>
          ) : !data ? (
            <RoadLoader label="Loading professional…" />
          ) : (
            <>
              <section className="pro-banner">
                <div className="pro-banner-art">
                  {data.photo ? (
                    <img src={data.photo} alt={data.name} />
                  ) : (
                    initialsFromName(data.name)
                  )}
                </div>
                <div>
                  <h1>{data.name}</h1>
                  <p>
                    <MapPin size={16} /> {data.city} · {data.type}
                  </p>
                  <p>
                    <ShieldCheck size={16} /> Credentials reviewed by Verifi Auto
                  </p>
                  <RatingLine summary={directoryCard(data, discovery.origin).rating} />
                  <p>Charges are confirmed in your quotation before approval.</p>
                  <div className="button-row">
                    {canBook ? (
                      <button className="primary" onClick={() => select(data)}>
                        Book assessment <ArrowRight size={18} />
                      </button>
                    ) : null}
                    {directoryCard(data, discovery.origin).directionsUrl ? (
                      <a
                        className="text-link"
                        href={directoryCard(data, discovery.origin).directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Directions <ArrowUpRight size={16} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>
              <div className="pro-profile-content">
                <div className="detail-main">
                  <Card className="pro-information dash-panel">
                    <section className="pro-information-section">
                      <h2>About</h2>
                      {data.about.length > 320 ? (
                        <>
                          <p>{data.about.slice(0, 320)}…</p>
                          <details className="fold">
                            <summary>Read full introduction</summary>
                            <p>{data.about}</p>
                          </details>
                        </>
                      ) : (
                        <p>{data.about}</p>
                      )}
                    </section>
                    <section className="pro-information-section">
                      <h2>Services</h2>
                      <ul className="pro-service-tags">
                        {data.services.map((s: string) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="pro-information-section">
                      <h2>Contact</h2>
                      <ul className="pro-contact">
                        {data.phone ? (
                          <li>
                            <a href={'tel:' + data.phone}>{data.phone}</a>
                          </li>
                        ) : null}
                        {data.address ? <li>{data.address}</li> : null}
                        {data.website ? (
                          <li>
                            <a href={data.website} target="_blank" rel="noreferrer">
                              Website
                            </a>
                          </li>
                        ) : null}
                      </ul>
                      {!data.phone && !data.website && !data.address ? (
                        <p>No public contact details recorded.</p>
                      ) : null}
                    </section>
                  </Card>
                  <DetailCard title="Customer reviews">
                    {data.reviews?.length ? (
                      data.reviews.map((review: any) => (
                        <article className="review-card" key={review.id}>
                          <p>
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)} · {review.customerName}
                          </p>
                          <p className="muted">{new Date(review.createdAt).toLocaleDateString()}</p>
                          {review.body.length > 180 ? (
                            <details className="fold">
                              <summary>Read full review</summary>
                              <p>{review.body}</p>
                            </details>
                          ) : (
                            <p>{review.body}</p>
                          )}
                        </article>
                      ))
                    ) : (
                      <p>No reviews yet</p>
                    )}
                    <p className="muted">
                      Customers can manage their review from the completed booking.
                    </p>
                  </DetailCard>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <ProfessionalsPage
          live
          embedded={embedded}
          results={results}
          loading={!data && !error}
          error={error}
          discovery={discovery}
          setDiscovery={setDiscovery}
          service={discovery.service}
          type={discovery.type}
          setService={(v: string) => changeFilter('service', v)}
          setType={(v: string) => changeFilter('type', v)}
          go={go}
          book={canBook ? select : undefined}
        >
          {data?.length === 100 ? (
            <button
              className="secondary"
              onClick={() => {
                setPrevious([...previous, ...data]);
                setCursor(data[data.length - 1].id);
              }}
            >
              Load more professionals
            </button>
          ) : null}
          {results.length >= 100 ? (
            <p className="muted">
              Distances rank the loaded results. Load more to include additional professionals.
            </p>
          ) : null}
        </ProfessionalsPage>
      )}
      {booking ? (
        <LiveDialog
          title={`Book an assessment with ${booking.name}`}
          onClose={() => setBooking(null)}
        >
          <p>
            Choose your vehicle and preferred appointment. The professional will confirm
            availability.
          </p>
          <form
            className="settings-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
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
            {vehicleError ? (
              <p role="alert">{vehicleError}</p>
            ) : !vehicles ? (
              <RoadLoader label="Loading your vehicles…" />
            ) : null}
            <label>
              Vehicle
              <select name="vehicleId" required>
                <option value="">Choose your car</option>
                {vehicles?.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} · {v.registration}
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
              <button type="button" className="secondary" onClick={() => setBooking(null)}>
                Cancel
              </button>
            </div>
          </form>
        </LiveDialog>
      ) : null}
    </>
  );
}
