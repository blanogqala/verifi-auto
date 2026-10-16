import { useState } from 'react';
import type { PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { VehicleStage } from '../../components/garage/VehicleStage';
import { activeVehicles, vehicleSnapshot } from '../../features/demo/links';

export function GaragePage({ data, go, setDialog }: any) {
  const vehicles = activeVehicles(data.vehicles || []);
  const [index, setIndex] = useState(0);
  const selected = vehicles[Math.min(index, Math.max(vehicles.length - 1, 0))];
  const count = vehicles.length;

  function move(next: number) {
    if (!count) return;
    setIndex((next + count) % count);
  }

  function swipe(event: PointerEvent<HTMLDivElement>) {
    const startX = event.clientX;
    const startY = event.clientY;
    function end(done: globalThis.PointerEvent) {
      const dx = done.clientX - startX;
      const dy = done.clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) move(index + (dx < 0 ? 1 : -1));
      window.removeEventListener('pointerup', end);
    }
    window.addEventListener('pointerup', end);
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
          <div className="showroom-stage" onPointerDown={swipe}>
            <p className="showroom-count">
              {count === 1 ? '1 vehicle' : `${Math.min(index, count - 1) + 1} of ${count}`}
            </p>
            <VehicleStage vehicle={selected} />
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
                </button>
              ))}
            </div>
          ) : (
            <p className="muted showroom-single">This is the only vehicle in your garage.</p>
          )}
        </section>
      )}
    </>
  );
}
