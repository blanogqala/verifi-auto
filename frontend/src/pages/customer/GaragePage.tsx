import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { VehicleStage } from '../../components/garage/VehicleStage';
import { activeVehicles, unresolvedHistory, vehicleSnapshot } from '../../features/demo/links';

export function GaragePage({ data, go, setDialog }: any) {
  const vehicles = activeVehicles(data.vehicles || []);
  const [index, setIndex] = useState(0);
  const selected = vehicles[Math.min(index, Math.max(vehicles.length - 1, 0))];
  const count = vehicles.length;
  const unresolved = unresolvedHistory(data);

  function move(next: number) {
    if (!count) return;
    setIndex((next + count) % count);
  }

  return (
    <>
      <div className="panel-title">
        <h2>Your vehicles</h2>
        <button className="primary" type="button" onClick={() => setDialog({ kind: 'vehicle' })}>
          Add vehicle <Plus size={17} />
        </button>
      </div>
      {!selected ? (
        <Card as="section" className="dash-panel showroom-empty">
          <h2>Your garage is empty</h2>
          <p>Add a vehicle to keep its records, bookings, and reminders together.</p>
        </Card>
      ) : (
        <section className="showroom" aria-roledescription="carousel" aria-label="Garage showroom">
          <div className="showroom-stage">
            <p className="showroom-count">
              {count === 1 ? '1 vehicle' : `${Math.min(index, count - 1) + 1} of ${count}`}
            </p>
            <VehicleStage key={selected.id} vehicle={selected} />
            <h2>
              {selected.year} {selected.make} {selected.model}
            </h2>
            <p>
              {selected.registration} · {Number(selected.mileage || 0).toLocaleString()} km
            </p>
            <div className="showroom-controls">
              <button
                className="secondary"
                type="button"
                aria-label="Previous vehicle"
                disabled={count < 2}
                onClick={() => move(index - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => go('dashboard/garage/' + encodeURIComponent(selected.id))}
              >
                View vehicle
              </button>
              <button
                className="secondary"
                type="button"
                aria-label="Next vehicle"
                disabled={count < 2}
                onClick={() => move(index + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {count > 1 ? (
            <div className="showroom-thumbs" aria-label="Vehicles">
              {vehicles.map((vehicle, thumbIndex) => (
                <button
                  key={vehicle.id}
                  type="button"
                  className={vehicle.id === selected.id ? 'selected' : ''}
                  aria-current={vehicle.id === selected.id ? 'true' : undefined}
                  onClick={() => setIndex(thumbIndex)}
                >
                  {vehicleSnapshot(vehicle)}
                  {vehicle.registration ? ` · ${vehicle.registration}` : ''}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted showroom-single">This is the only vehicle in your garage.</p>
          )}
        </section>
      )}
      {unresolved.length ? (
        <Card as="section" className="dash-panel">
          <h2>History not linked to a vehicle</h2>
          <p className="muted">
            These records stay unlinked. A shared or unknown vehicle name is not assigned automatically when a
            vehicle is renamed, archived, or removed.
          </p>
          {unresolved.map((item: any) => (
            <article key={item.historyKind + '-' + item.id} className="document-row">
              <div>
                <b>{item.title || item.status || 'History record'}</b>
                <small>
                  {item.vehicleLabel || item.vehicle || 'Vehicle name not recorded'}
                  {item.registration ? ` · ${item.registration}` : ''}
                  {item.provider ? ` · ${item.provider}` : ''}
                </small>
              </div>
              <button
                className="secondary"
                type="button"
                onClick={() => setDialog({ kind: 'resolve-history', item })}
              >
                Choose a vehicle
              </button>
            </article>
          ))}
        </Card>
      ) : null}
    </>
  );
}
