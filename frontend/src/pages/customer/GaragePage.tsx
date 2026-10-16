import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { VehicleStage } from '../../components/garage/VehicleStage';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { selectVehicleId, vehicleCardImage, vehicleCardLabel } from '../../features/garage/garageSelection';
import { activeVehicles, unresolvedHistory } from '../../features/demo/links';
import { followDetail } from '../../features/navigation/returnPath';

function VehicleSilhouette() {
  return (
    <svg className="garage-card-silhouette" viewBox="0 0 200 96" aria-hidden="true">
      <path d="M34 58h132c6 0 10 4 10 8v2H24v-2c0-4 4-8 10-8z" />
      <path d="M52 58 70 38c2-3 6-6 10-6h48c5 0 9 2 12 6l16 20" />
      <circle cx="68" cy="70" r="8" />
      <circle cx="138" cy="70" r="8" />
    </svg>
  );
}

function storedGarageId() {
  try {
    return sessionStorage.getItem('verifi-garage-selected') || '';
  } catch {
    return '';
  }
}

export function GaragePage({ data, go, setDialog }: any) {
  const vehicles = activeVehicles(data.vehicles || []);
  const [selectedId, setSelectedId] = useState(storedGarageId() || vehicles[0]?.id || '');
  const resolvedId = vehicles.some((vehicle) => vehicle.id === selectedId) ? selectedId : vehicles[0]?.id || '';
  const selected = vehicles.find((vehicle) => vehicle.id === resolvedId);
  const unresolved = unresolvedHistory(data);
  const single = vehicles.length < 2;

  useEffect(() => {
    if (resolvedId !== selectedId) setSelectedId(resolvedId);
  }, [resolvedId, selectedId]);
  useEffect(() => {
    if (!resolvedId) return;
    try {
      sessionStorage.setItem('verifi-garage-selected', resolvedId);
    } catch {
      /* Selection still works until the page is left. */
    }
  }, [resolvedId]);

  return (
    <>
      {!selected ? (
        <Card as="section" className="dash-panel showroom-empty">
          <h2>Your garage is empty</h2>
          <p>Add a vehicle to keep its records, bookings, and reminders together.</p>
        </Card>
      ) : (
        <>
          <section className="showroom" aria-label="Garage showroom">
            <VehicleStage vehicle={selected} />
            <div className="showroom-nav">
              <button
                type="button"
                className="showroom-arrow"
                aria-label="Previous vehicle"
                disabled={single}
                onClick={() => setSelectedId(selectVehicleId(vehicles, resolvedId, -1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => followDetail(go, 'dashboard/garage', 'dashboard/garage/' + encodeURIComponent(selected.id))}
              >
                View details
              </button>
              <button
                type="button"
                className="showroom-arrow"
                aria-label="Next vehicle"
                disabled={single}
                onClick={() => setSelectedId(selectVehicleId(vehicles, resolvedId, 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
          <div className="garage-cards" aria-label="Your vehicles">
            {vehicles.map((vehicle) => {
              const selectedCard = vehicle.id === selected.id;
              const image = vehicleCardImage(resolveVehicleAsset(vehicle));
              const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  className={'garage-card' + (selectedCard ? ' selected' : '')}
                  aria-pressed={selectedCard}
                  aria-label={vehicleCardLabel(vehicle, vehicles)}
                  onClick={() => setSelectedId(vehicle.id)}
                >
                  {image ? <img src={image} alt="" /> : <VehicleSilhouette />}
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </>
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
              <button className="secondary" type="button" onClick={() => setDialog({ kind: 'resolve-history', item })}>
                Choose a vehicle
              </button>
            </article>
          ))}
        </Card>
      ) : null}
    </>
  );
}
