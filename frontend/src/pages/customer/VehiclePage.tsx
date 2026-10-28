import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { GarageVarGallery, GarageBookingHistory } from '../../components/garage/VehicleHistorySections';
import { Card } from '../../components/ui/Card';
import { DetailPanel, DetailTabs } from '../../components/ui/DetailTabs';
import { DetailBack, DetailCard, DetailFields } from '../../components/ui/DetailChrome';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { historyCouldBelongTo } from '../../features/demo/links';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { vehicleCardImage } from '../../features/garage/garageSelection';
import { formatDay } from '../../features/jobs/bookingProgress';
import {
  careSourceLabel,
  careStateLabel,
  dateCareState,
  mileageCareState,
} from '../../features/garage/vehicleCare';
import { backTarget, returnLabel } from '../../features/navigation/returnPath';

function bookingsFor(data: any, vehicle: any) {
  return (data.vehicles && data.jobs ? data.jobs : []).filter(
    (job: any) => job.vehicleId === vehicle.id,
  );
}

function recorded(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function mileageText(value: unknown) {
  const text = recorded(value);
  if (!text) return 'Not recorded';
  const number = Number(text);
  if (!Number.isFinite(number)) return 'Not recorded';
  return `${number.toLocaleString()} km`;
}

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

function Reminder({
  label,
  state,
  detail,
  source,
}: {
  label: string;
  state: string;
  detail: string;
  source: string;
}) {
  return (
    <article className="reminder-row">
      <div>
        <b>{label}</b>
        <span>{detail}</span>
        <small>{source}</small>
      </div>
      <Status value={state} />
    </article>
  );
}

function urgentCare(label: string, state: string) {
  if (state !== 'expired' && state !== 'due') return '';
  return `${label} is ${careStateLabel(state).toLowerCase()}`;
}

export function VehiclePage({ data, go, setDialog, vehicleId, live = false }: any) {
  const [tab, setTab] = useState('overview');
  const vehicle = (data.vehicles || []).find((item: any) => item.id === vehicleId);
  const here = 'dashboard/garage/' + encodeURIComponent(vehicleId || '');
  const back = backTarget(here, 'dashboard/garage');
  useEffect(() => {
    setTab('overview');
  }, [vehicleId]);
  useEffect(() => {
    if (!vehicle?.id) return;
    try {
      sessionStorage.setItem('verifi-garage-selected', vehicle.id);
    } catch {
      /* Returning to the garage still opens the last selection when storage is available. */
    }
  }, [vehicle?.id]);
  if (!vehicle) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to My Garage" onClick={() => go('dashboard/garage')} />
        <Card as="section" className="dash-panel">
          <h1>Vehicle not found</h1>
          <p>This garage link does not match a vehicle in this browser.</p>
        </Card>
      </div>
    );
  }
  const records = (data.records || []).filter((record: any) => record.vehicleId === vehicle.id);
  const bookings = bookingsFor(data, vehicle);
  const linked =
    live ||
    [...(data.jobs || []), ...(data.records || [])].some((item) =>
      historyCouldBelongTo(item, vehicle),
    );
  const disc = dateCareState(vehicle.licenceDiscExpiry);
  const serviceDate = dateCareState(vehicle.nextServiceDate);
  const serviceMileage = mileageCareState(vehicle.mileage, vehicle.nextServiceMileage);
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';
  const image = vehicle.photo || (live
    ? vehicle.modelAsset?.previewUrl || ''
    : vehicleCardImage(resolveVehicleAsset(vehicle)));
  const urgent = [
    urgentCare('Next service', serviceDate),
    urgentCare('Next service mileage', serviceMileage),
    urgentCare('Licence disc expiry', disc),
  ].filter(Boolean);

  return (
    <div className="detail-page vehicle-detail">
      <DetailBack label={returnLabel(back)} onClick={() => go(back)} />
      <header className="detail-header vehicle-identity">
        <div className="vehicle-identity-art">
          <VehicleArt image={image} />
        </div>
        <div>
          <h1>{name}</h1>
          <p className="detail-summary">
            <span>{recorded(vehicle.registration) || 'Registration not recorded'}</span>
            <Status value={vehicle.archived ? 'Archived' : 'Active'} />
          </p>
        </div>
        <div className="detail-header-aside">
          <button
            className="primary"
            type="button"
            onClick={() => setDialog({ kind: 'vehicle', vehicle })}
          >
            Edit vehicle
          </button>
          <button className="secondary garage-delete-action" type="button"
            onClick={() => setDialog({ kind: 'archive-vehicle', vehicle, linked })}>
            <Trash2 size={16} aria-hidden="true"/> Delete vehicle
          </button>
        </div>
      </header>
      <DetailTabs
        id="vehicle-detail"
        label="Vehicle details"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'history', label: 'History' },
        ]}
      />
      {tab === 'history' && urgent.length ? (
        <p className="urgent-summary" role="status">
          {urgent.join(' · ')}
        </p>
      ) : null}
      <DetailPanel scope="vehicle-detail" tabId="overview" value={tab}>
        <div className="garage-detail-grid">
        <DetailCard title="Vehicle facts">
          <DetailFields
            items={[
              { label: 'Make', value: recorded(vehicle.make) || 'Not recorded' },
              { label: 'Model', value: recorded(vehicle.model) || 'Not recorded' },
              { label: 'Year', value: recorded(vehicle.year) || 'Not recorded' },
              { label: 'Body style', value: recorded(vehicle.bodyStyle) || 'Not recorded' },
              { label: 'Variant', value: recorded(vehicle.variant) || 'Not recorded' },
              {
                label: 'Paint colour',
                value: recorded(vehicle.paintColorName || vehicle.paintColor) ? (
                  <span className="paint-value">
                    <i style={{ background: vehicle.paintColor }} />
                    {vehicle.paintColorName || vehicle.paintColor}
                  </span>
                ) : (
                  'Not recorded'
                ),
              },
              { label: 'Registration', value: recorded(vehicle.registration) || 'Not recorded' },
              { label: 'Mileage', value: mileageText(vehicle.mileage) },
            ]}
          />
          <p className="muted">Service plans are not available yet.</p>
        </DetailCard>
        <DetailCard
          title="Care reminders"
          action={
            <button
              className="text-link"
              type="button"
              onClick={() => setDialog({ kind: 'vehicle', vehicle })}
            >
              Edit reminders
            </button>
          }
        >
          <Reminder
            label="Next service"
            state={careStateLabel(serviceDate)}
            detail={vehicle.nextServiceDate ? formatDay(vehicle.nextServiceDate) : 'No date saved'}
            source={careSourceLabel(vehicle.nextServiceSource)}
          />
          <Reminder
            label="Next service mileage"
            state={careStateLabel(serviceMileage)}
            detail={
              recorded(vehicle.nextServiceMileage)
                ? mileageText(vehicle.nextServiceMileage)
                : 'No mileage saved'
            }
            source={careSourceLabel(vehicle.nextServiceSource)}
          />
          <Reminder
            label="Licence disc expiry"
            state={careStateLabel(disc)}
            detail={
              vehicle.licenceDiscExpiry ? formatDay(vehicle.licenceDiscExpiry) : 'No date saved'
            }
            source={careSourceLabel(vehicle.licenceDiscSource)}
          />
          <p className="muted">Only saved dates are shown.</p>
        </DetailCard>
        </div>
        <GarageVarGallery bookings={bookings} records={records}/>
      </DetailPanel>
      <DetailPanel scope="vehicle-detail" tabId="history" value={tab}>
        <GarageBookingHistory bookings={bookings} go={go} from={here}/>
      </DetailPanel>
    </div>
  );
}
