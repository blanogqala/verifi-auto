import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Camera, CarFront, Settings2, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { VehicleStage } from '../../components/garage/VehicleStage';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import {
  selectVehicleId,
  vehicleCardImage,
  vehicleCardLabel,
} from '../../features/garage/garageSelection';
import { activeVehicles, unresolvedHistory } from '../../features/demo/links';
import { followDetail } from '../../features/navigation/returnPath';

function storedGarageId() {
  try {
    return sessionStorage.getItem('verifi-garage-selected') || '';
  } catch {
    return '';
  }
}

export function GaragePage({ data, go, setDialog, connected }: any) {
  const vehicles = activeVehicles(data.vehicles || []);
  const [selectedId, setSelectedId] = useState(storedGarageId() || vehicles[0]?.id || '');
  const resolvedId = vehicles.some((vehicle) => vehicle.id === selectedId)
    ? selectedId
    : vehicles[0]?.id || '';
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
          <section className="showroom showroom-premium" aria-label="Garage showroom">
            <header className="showroom-intro">
              <div className="showroom-intro-copy">
                <div className="showroom-eyebrow"><Sparkles size={14} aria-hidden="true" /> YOUR PERSONAL SHOWROOM</div>
                <h2>{[selected.make, selected.model].filter(Boolean).join(' ') || 'Your vehicle'}</h2>
                <p>
                  {[selected.year, selected.variant || selected.bodyStyle, selected.paintColorName]
                    .filter(Boolean).join(' · ') || 'Your vehicle, your journey'}
                </p>
              </div>
              <button className="showroom-edit-button" type="button"
                onClick={() => setDialog({ kind: 'vehicle', vehicle: selected })}>
                <Settings2 size={16} aria-hidden="true" /> Edit vehicle
              </button>
            </header>
            {connected ? connected.renderStage(selected) : <VehicleStage vehicle={selected} />}
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
                onClick={() =>
                  followDetail(
                    go,
                    'dashboard/garage',
                    'dashboard/garage/' + encodeURIComponent(selected.id),
                  )
                }
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
          <div className="garage-collection-heading">
            <div>
              <span className="showroom-eyebrow"><CarFront size={14} aria-hidden="true" /> THE COLLECTION</span>
              <h3>Your vehicles <span>{vehicles.length}</span></h3>
            </div>
            <p>Select a vehicle to open its showroom.</p>
          </div>
          <div className="garage-cards" aria-label="Your vehicles">
            {vehicles.map((vehicle) => {
              const selectedCard = vehicle.id === selected.id;
              const image = vehicle.photo || (connected
                ? vehicle.modelAsset?.previewUrl || ''
                : vehicleCardImage(resolveVehicleAsset(vehicle)));
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
                  {image ? (
                    <img src={image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="garage-card-empty" aria-hidden="true"><Camera size={26} strokeWidth={1.4} /></span>
                  )}
                  <span className="garage-card-name">{name}</span>
                  <span className="garage-card-meta">{[vehicle.year, vehicle.registration].filter(Boolean).join(' · ') || 'Vehicle in your garage'}</span>
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
            These records stay unlinked. A shared or unknown vehicle name is not assigned
            automatically when a vehicle is renamed, archived, or removed.
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
