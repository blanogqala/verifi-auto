import { AppointmentFields } from '../components/booking/AppointmentFields';
import { VehicleForm } from './LiveVehicles';
import { ProfessionalProfilePage } from '../components/professionals/ProfessionalProfilePage';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ProfessionalsPage } from '../pages/public/ProfessionalsPage';
import { RoadLoader } from '../components/ui/RoadLoader';
import { defaultDiscovery, type DiscoverySession } from '../features/professionals/discovery';
import {
  coordinatesOf,
  haversineKm,
  approximateDistanceLabel,
} from '../features/professionals/geo';
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
  const [date, setDate] = useState(''),
    [time, setTime] = useState('09:00');
  const [vehicleId, setVehicleId] = useState(''),
    [description, setDescription] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);
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
    setAddingVehicle(false);
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
        <div>
          {error ? (
            <p role="alert">{error}</p>
          ) : !data ? (
            <RoadLoader label="Loading professional…" />
          ) : (
            <ProfessionalProfilePage
              professionalId={professionalId}
              embedded={embedded}
              data={{ settings: { id: user?.id } }}
              role={user?.role?.toLowerCase()}
              book={canBook ? () => select(data) : undefined}
              go={go}
              connected={{
                profile: {
                  ...data,
                  bio: data.about,
                  place: data.city,
                  area: data.city,
                  sample: false,
                },
                rating: directoryCard(data, discovery.origin).rating,
                directionsUrl: directoryCard(data, discovery.origin).directionsUrl,
                reviews: (data.reviews || []).map((r: any) => ({ ...r, text: r.body })),
              }}
            />
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
          title={addingVehicle ? 'Add vehicle' : 'Book an assessment'}
          showTitle={false}
          workspace={false}
          onClose={() => setBooking(null)}
        >
          {addingVehicle ? (
            <>
              <h2>Add vehicle</h2>
              <VehicleForm
                run={run}
                onSave={(created: any) => {
                  setVehicleId(created.id);
                  setAddingVehicle(false);
                }}
              />
              <button className="text-link back" onClick={() => setAddingVehicle(false)}>
                Back to appointment
              </button>
            </>
          ) : (
            <>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  await run(async () => {
                    const job = await api('/bookings', 'POST', {
                      vehicleId,
                      description,
                      professionalId: booking.id,
                      appointmentAt: new Date(`${date}T${time}`).toISOString(),
                      clientRequestId: requestId,
                    });
                    setBooking(null);
                    go('dashboard/bookings/' + job.id);
                  }, 'Booking request sent.');
                  setBusy(false);
                }}
              >
                <h2>{booking.name}</h2>
                <p>
                  {booking.city || booking.area} · {booking.type}
                </p>
                <p className="muted">
                  Charges are confirmed in your quotation before approval. A preferred time is not
                  confirmed availability.
                </p>
                {vehicleError ? (
                  <p role="alert">{vehicleError}</p>
                ) : !vehicles ? (
                  <RoadLoader label="Loading your vehicles…" />
                ) : null}
                <AppointmentFields
                  vehicles={vehicles || []}
                  vehicleId={vehicleId}
                  setVehicleId={setVehicleId}
                  date={date}
                  setDate={setDate}
                  time={time}
                  setTime={setTime}
                  description={description}
                  setDescription={setDescription}
                  onAddVehicle={() => setAddingVehicle(true)}
                />
                <button className="primary full" disabled={busy || !vehicles?.length}>
                  {busy ? 'Sending…' : 'Request assessment'} <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}
        </LiveDialog>
      ) : null}
    </>
  );
}
