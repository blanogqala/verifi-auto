import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { VehicleStage } from '../../components/garage/VehicleStage';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { activeVehicles, unresolvedHistory } from '../../features/demo/links';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { saveVehicle } from '../../features/demo/demoActions';

export function GaragePage({ data, go, notify, setDialog, update }: any) {
  const vehicles = activeVehicles(data.vehicles || []);
  const [selectedId, setSelectedId] = useState(vehicles[0]?.id || '');
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) || vehicles[0];
  const unresolved = unresolvedHistory(data);

  function persist(vehicle: any, patch: any) {
    commitUpdate(update, (current: any) => saveVehicle(current, { ...vehicle, ...patch }), notify, '');
  }

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
            <VehicleStage
              vehicle={selected}
              onBodyStyle={(bodyStyle, variant) => persist(selected, { bodyStyle, variant })}
              onPaint={(paintColor) => persist(selected, { paintColor })}
            />
            <details className="model-details">
              <summary>Model details</summary>
              <p>
                Lookup uses the local approved catalogue. It does not search the internet, and a demonstration model
                is not a remote match for this vehicle.
              </p>
              <p>
                Future asset search belongs on the server. A candidate has to be checked for accuracy, permitted use,
                attribution, file safety, and phone performance before it is published.
              </p>
            </details>
          </section>
          <div className="garage-cards" aria-label="Your vehicles">
            {vehicles.map((vehicle) => {
              const match = resolveVehicleAsset(vehicle);
              const selectedCard = vehicle.id === selected.id;
              return (
                <article key={vehicle.id} className={'garage-card' + (selectedCard ? ' selected' : '')}>
                  <button
                    type="button"
                    className="garage-card-select"
                    aria-pressed={selectedCard}
                    onClick={() => setSelectedId(vehicle.id)}
                  >
                    {match.accuracy === 'exact' && match.asset?.thumbnail ? (
                      <img src={match.asset.thumbnail} alt="" />
                    ) : (
                      <span className="garage-card-thumb" aria-hidden="true" />
                    )}
                    <b>
                      {vehicle.make} {vehicle.model}
                    </b>
                    <span>{vehicle.year}</span>
                    <span>{vehicle.registration}</span>
                    <span>{Number(vehicle.mileage || 0).toLocaleString()} km</span>
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => go('dashboard/garage/' + encodeURIComponent(vehicle.id))}
                  >
                    View details
                  </button>
                </article>
              );
            })}
          </div>
          {vehicles.length === 1 ? <p className="muted">This is the only vehicle in your garage.</p> : null}
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
