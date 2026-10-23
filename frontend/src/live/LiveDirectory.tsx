import { useEffect, useState } from 'react';
import { MapPin, ShieldCheck, ArrowRight, ArrowUpRight, Star } from 'lucide-react';
import { ProfessionalsPage } from '../pages/public/ProfessionalsPage';
import { BookingDialog } from '../components/booking/BookingDialog';
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
import { api } from './api';
import { calendarDateOrNull } from '../features/garage/vehicleDates';

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
    [addedVehicles, setAddedVehicles] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState(0);
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
    setBooking({ ...pro, area: pro.area || pro.place || pro.city || '' });
    setStep(0);
    setDate('');
    setTime('09:00');
    setDescription('');
    setVehicleId('');
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
                    <img src={data.photo} alt="" />
                  ) : (
                    <span aria-hidden="true">{initialsFromName(data.name)}</span>
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
                  {directoryCard(data, discovery.origin).distanceLabel ? (
                    <p>{directoryCard(data, discovery.origin).distanceLabel}</p>
                  ) : null}
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
                  <Card as="section" className="pro-information dash-panel">
                    <section className="pro-information-section">
                      <h2>About</h2>
                      {data.about.length > 320 ? (
                        <>
                          <p>{data.about.slice(0, 320)}…</p>
                          <details className="pro-about-more">
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
                        {data.email ? (
                          <li>
                            <a href={'mailto:' + data.email}>{data.email}</a>
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
                      {!data.phone && !data.website && !data.address && !data.email ? (
                        <p>No public contact details recorded.</p>
                      ) : null}
                    </section>
                  </Card>
                  <DetailCard title="Customer reviews">
                    {data.reviews?.length ? (
                      data.reviews.map((review: any) => (
                        <article className="review-card" key={review.id}>
                          <p>
                            <Star size={16} aria-hidden="true" />{' '}
                            <span className="visually-hidden">Rating</span>
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)} · {review.customerName}
                          </p>
                          <p className="muted">{new Date(review.createdAt).toLocaleDateString()}</p>
                          {review.body.length > 180 ? (
                            <details className="pro-about-more">
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
        <BookingDialog
          connected
          modal={booking}
          step={step}
          setStep={setStep}
          date={date}
          setDate={setDate}
          time={time}
          setTime={setTime}
          vehicleId={vehicleId}
          setVehicleId={setVehicleId}
          description={description}
          setDescription={setDescription}
          requestId={requestId}
          setRequestId={setRequestId}
          vehicles={[...(vehicles || []), ...addedVehicles]}
          vehiclesLoading={Boolean(!vehicles && !vehicleError)}
          go={go}
          setModal={(value: any) => {
            if (!value) {
              setBooking(null);
              setStep(0);
            }
          }}
          onLiveBook={async ({
            vehicleId: chosenVehicle,
            date: chosenDate,
            time: chosenTime,
            description: chosenDescription,
          }: any) => {
            const appointmentAt = new Date(`${chosenDate}T${chosenTime}:00`).toISOString();
            if (Number.isNaN(Date.parse(appointmentAt)))
              throw new Error('Choose a valid date and time.');
            await api('/bookings', 'POST', {
              vehicleId: chosenVehicle,
              professionalId: booking.id,
              appointmentAt,
              description: chosenDescription,
              clientRequestId: requestId,
            });
          }}
          onLiveVehicle={async (fields: any) => {
            const paint = String(fields.paintColor || '');
            const styles = new Set([
              '',
              'hatchback',
              'sedan',
              'estate',
              'coupe',
              'concept coupe',
              'suv',
              'van',
              'other',
            ]);
            const style = String(fields.bodyStyle || '');
            const serviceMileage = String(fields.nextServiceMileage ?? '').trim();
            const created = await api('/vehicles', 'POST', {
              make: String(fields.make || ''),
              model: String(fields.model || ''),
              year: Number(fields.year),
              mileage: Number(fields.mileage || 0),
              registration: String(fields.registration || ''),
              variant: String(fields.variant || ''),
              bodyStyle: styles.has(style) ? style : '',
              paintColorName: String(fields.paintColorName || ''),
              paintColor: /^#[0-9a-fA-F]{6}$/.test(paint) ? paint : '',
              licenceDiscExpiry: calendarDateOrNull(fields.licenceDiscExpiry),
              nextServiceDate: calendarDateOrNull(fields.nextServiceDate),
              nextServiceMileage: serviceMileage === '' ? null : Number(serviceMileage),
            });
            setAddedVehicles((current) => [...current, created]);
            return created.id;
          }}
        />
      ) : null}
    </>
  );
}
