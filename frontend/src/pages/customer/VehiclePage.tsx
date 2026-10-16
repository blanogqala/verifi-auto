import { VehicleStage } from '../../components/garage/VehicleStage';
import { Card } from '../../components/ui/Card';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { historyCouldBelongTo } from '../../features/demo/links';
import { bookingReference } from '../../features/jobs/jobViews';
import { formatDay } from '../../features/jobs/bookingProgress';
import { careSourceLabel, careStateLabel, dateCareState, mileageCareState } from '../../features/garage/vehicleCare';
import { backTarget, followDetail, returnLabel } from '../../features/navigation/returnPath';
import { CalendarClock, Car, ClipboardList, Shield, Wrench } from 'lucide-react';

function bookingsFor(data: any, vehicle: any) {
  return (data.vehicles && data.jobs ? data.jobs : []).filter((job: any) => job.vehicleId === vehicle.id);
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

function Reminder({ label, state, detail, source }: { label: string; state: string; detail: string; source: string }) {
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

export function VehiclePage({ data, go, setDialog, vehicleId }: any) {
  const vehicle = (data.vehicles || []).find((item: any) => item.id === vehicleId);
  const here = 'dashboard/garage/' + encodeURIComponent(vehicleId || '');
  const back = backTarget(here, 'dashboard/garage');
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
  const linked = [...(data.jobs || []), ...(data.records || [])].some((item) => historyCouldBelongTo(item, vehicle));
  const disc = dateCareState(vehicle.licenceDiscExpiry);
  const serviceDate = dateCareState(vehicle.nextServiceDate);
  const serviceMileage = mileageCareState(vehicle.mileage, vehicle.nextServiceMileage);
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';

  return (
    <div className="detail-page">
      <DetailBack label={returnLabel(back)} onClick={() => go(back)} />
      <DetailHeader
        kicker={vehicle.year ? String(vehicle.year) : 'Year not recorded'}
        title={name}
        summary={
          <>
            <span>{recorded(vehicle.registration) || 'Registration not recorded'}</span>
            <Status value={vehicle.archived ? 'Archived' : 'Active'} />
          </>
        }
        aside={
          <button className="primary" type="button" onClick={() => setDialog({ kind: 'vehicle', vehicle })}>
            Edit vehicle
          </button>
        }
      />
      <div className="detail-layout">
        <div className="detail-main">
          <DetailCard icon={<Car size={18} aria-hidden="true" />} title="Vehicle">
            <div className="showroom showroom-compact">
              <VehicleStage compact vehicle={vehicle} />
            </div>
          </DetailCard>
          <DetailCard icon={<ClipboardList size={18} aria-hidden="true" />} title="Vehicle information">
            <DetailFields
              items={[
                { label: 'Make', value: recorded(vehicle.make) || 'Not recorded' },
                { label: 'Model', value: recorded(vehicle.model) || 'Not recorded' },
                { label: 'Year', value: recorded(vehicle.year) || 'Not recorded' },
                { label: 'Body style', value: recorded(vehicle.bodyStyle) || 'Not recorded' },
                { label: 'Variant', value: recorded(vehicle.variant) || 'Not recorded' },
                {
                  label: 'Paint colour',
                  value: recorded(vehicle.paintColor) ? (
                    <span className="paint-value">
                      <i style={{ background: vehicle.paintColor }} />
                      {vehicle.paintColor}
                    </span>
                  ) : (
                    'Not recorded'
                  ),
                },
                { label: 'Registration', value: recorded(vehicle.registration) || 'Not recorded' },
                { label: 'Mileage', value: mileageText(vehicle.mileage) },
              ]}
            />
          </DetailCard>
          <DetailCard icon={<Wrench size={18} aria-hidden="true" />} title="Service history">
            <p className="muted">Only records linked to this vehicle are shown.</p>
            {records.length ? (
              <ol className="history-list">
                {records.map((record: any) => (
                  <li key={record.id}>
                    <time dateTime={record.date || undefined}>{formatDay(record.date)}</time>
                    <b>{record.title || 'Service record'}</b>
                    <span>{record.provider || 'Professional not recorded'}</span>
                    <span>{mileageText(record.mileage)}</span>
                    {record.notes ? <p>{record.notes}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No service records are linked to this vehicle.</p>
            )}
          </DetailCard>
          <DetailCard icon={<CalendarClock size={18} aria-hidden="true" />} title="Related bookings">
            {bookings.length ? (
              <div className="related-bookings">
                {bookings.map((job: any) => (
                  <article key={job.id} className="related-booking">
                    <div>
                      <b>{bookingReference(job)}</b>
                      <span>
                        {job.date ? formatDay(job.date) : 'Date not recorded'}
                        {job.time ? ` at ${job.time}` : ''}
                      </span>
                      <Status value={job.status} />
                    </div>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => followDetail(go, here, 'dashboard/bookings/' + encodeURIComponent(job.id))}
                    >
                      Open booking
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p>No bookings are linked to this vehicle.</p>
            )}
          </DetailCard>
        </div>
        <div className="detail-side">
          <DetailCard
            icon={<CalendarClock size={18} aria-hidden="true" />}
            title="Reminders"
            action={
              <button className="text-link" type="button" onClick={() => setDialog({ kind: 'vehicle', vehicle })}>
                Edit reminders
              </button>
            }
          >
            <p className="muted">Shown in the app only. Email, SMS, and push reminders are not sent.</p>
            <Reminder
              label="Next service date"
              state={careStateLabel(serviceDate)}
              detail={vehicle.nextServiceDate ? formatDay(vehicle.nextServiceDate) : 'No date saved'}
              source={careSourceLabel(vehicle.nextServiceSource)}
            />
            <Reminder
              label="Next service mileage"
              state={careStateLabel(serviceMileage)}
              detail={recorded(vehicle.nextServiceMileage) ? mileageText(vehicle.nextServiceMileage) : 'No mileage saved'}
              source={careSourceLabel(vehicle.nextServiceSource)}
            />
            <Reminder
              label="Licence disc expiry"
              state={careStateLabel(disc)}
              detail={vehicle.licenceDiscExpiry ? formatDay(vehicle.licenceDiscExpiry) : 'No date saved'}
              source={careSourceLabel(vehicle.licenceDiscSource)}
            />
            <p className="muted">No service interval is assumed. A date appears only when someone records it.</p>
          </DetailCard>
          <DetailCard icon={<Shield size={18} aria-hidden="true" />} title="Service plans" quiet>
            <p>Service plans are not available yet.</p>
          </DetailCard>
          <DetailCard icon={<Car size={18} aria-hidden="true" />} title="Vehicle management" quiet>
            <p>
              {linked
                ? 'Bookings and service records stay in this browser. Archiving removes the vehicle from the showroom.'
                : 'This vehicle has no linked history. Removing it deletes only this vehicle record.'}
            </p>
            <button
              className="secondary"
              type="button"
              onClick={() => setDialog({ kind: 'archive-vehicle', vehicle, linked })}
            >
              {linked ? 'Archive vehicle' : 'Remove vehicle'}
            </button>
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
