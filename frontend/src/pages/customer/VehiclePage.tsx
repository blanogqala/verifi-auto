import { VehicleStage } from '../../components/garage/VehicleStage';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { historyCouldBelongTo } from '../../features/demo/links';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { saveVehicle } from '../../features/demo/demoActions';
import { bookingReference } from '../../features/jobs/jobViews';
import { careSourceLabel, careStateLabel, dateCareState, mileageCareState } from '../../features/garage/vehicleCare';

function bookingsFor(data: any, vehicle: any) {
  return (data.vehicles && data.jobs ? data.jobs : []).filter((job: any) => job.vehicleId === vehicle.id);
}

export function VehiclePage({ data, go, notify = () => {}, setDialog, update = () => false, vehicleId }: any) {
  const vehicle = (data.vehicles || []).find((item: any) => item.id === vehicleId);
  if (!vehicle) {
    return (
      <Card as="section" className="dash-panel">
        <h2>Vehicle not found</h2>
        <p>This garage link does not match a vehicle in this browser.</p>
        <button className="secondary" type="button" onClick={() => go('dashboard/garage')}>
          Back to My Garage
        </button>
      </Card>
    );
  }
  const records = (data.records || []).filter((record: any) => record.vehicleId === vehicle.id);
  const bookings = bookingsFor(data, vehicle);
  const linked = [...(data.jobs || []), ...(data.records || [])].some((item) =>
    historyCouldBelongTo(item, vehicle),
  );
  const disc = dateCareState(vehicle.licenceDiscExpiry);
  const serviceDate = dateCareState(vehicle.nextServiceDate);
  const serviceMileage = mileageCareState(vehicle.mileage, vehicle.nextServiceMileage);

  return (
    <div className="vehicle-detail">
      <div className="showroom showroom-compact">
        <VehicleStage
          compact
          vehicle={vehicle}
          onBodyStyle={(bodyStyle, variant) =>
            commitUpdate(update, (current: any) => saveVehicle(current, { ...vehicle, bodyStyle, variant }), notify, '')
          }
          onPaint={(paintColor) =>
            commitUpdate(update, (current: any) => saveVehicle(current, { ...vehicle, paintColor }), notify, '')
          }
        />
        <h2>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        <p>
          {vehicle.registration} · {Number(vehicle.mileage || 0).toLocaleString()} km
        </p>
        {vehicle.archived ? <Status value="Archived" /> : null}
      </div>
      <div className="button-row">
        <button className="primary" type="button" onClick={() => setDialog({ kind: 'vehicle', vehicle })}>
          Edit vehicle
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => setDialog({ kind: 'archive-vehicle', vehicle, linked })}
        >
          {linked ? 'Archive vehicle' : 'Remove vehicle'}
        </button>
      </div>
      <Card as="section" className="dash-panel">
        <h2>Vehicle record (VAR)</h2>
        <p className="muted">
          This is the history kept in this browser. It is not an official external vehicle report.
        </p>
        <p>
          Mileage <strong>{Number(vehicle.mileage || 0).toLocaleString()} km</strong>
        </p>
        <h3>Bookings</h3>
        {bookings.length ? (
          bookings.map((job: any) => (
            <button
              key={job.id}
              className="text-link"
              type="button"
              onClick={() => go('dashboard/bookings/' + encodeURIComponent(job.id))}
            >
              {bookingReference(job)} · {job.status}
            </button>
          ))
        ) : (
          <p>No bookings are linked to this vehicle.</p>
        )}
        <h3>Service history</h3>
        {records.length ? (
          records.map((record: any) => (
            <article key={record.id}>
              <p>
                {record.date} · {record.title}
              </p>
              <p>
                {record.provider} · {record.mileage} km
              </p>
              <p>{record.notes}</p>
            </article>
          ))
        ) : (
          <p>No service records are linked to this vehicle.</p>
        )}
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Reminders</h2>
        <p className="muted">Shown in the app only. Email, SMS, and push reminders are not sent.</p>
        <p>
          Licence disc <Status value={careStateLabel(disc)} />{' '}
          {vehicle.licenceDiscExpiry || 'No date saved'} · {careSourceLabel(vehicle.licenceDiscSource)}
        </p>
        <p>
          Next service date <Status value={careStateLabel(serviceDate)} />{' '}
          {vehicle.nextServiceDate || 'No date saved'} · {careSourceLabel(vehicle.nextServiceSource)}
        </p>
        <p>
          Next service mileage <Status value={careStateLabel(serviceMileage)} />{' '}
          {vehicle.nextServiceMileage ? `${Number(vehicle.nextServiceMileage).toLocaleString()} km` : 'No mileage saved'} ·{' '}
          {careSourceLabel(vehicle.nextServiceSource)}
        </p>
        <p className="muted">No manufacturer service interval is assumed. Dates appear only when someone records them.</p>
      </Card>
      <Card as="section" className="dash-panel">
        <h2>Service plans</h2>
        <p>Service plans are not available yet.</p>
        <p className="muted">Prices, terms, and payment are not offered in this preview.</p>
      </Card>
    </div>
  );
}
