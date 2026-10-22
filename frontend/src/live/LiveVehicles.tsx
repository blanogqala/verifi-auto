import { VehiclePage } from '../pages/customer/VehiclePage';
import { LiveDialog } from './LiveDialog';
import { bookingCardData } from './LiveWorkspaceViews';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const VehicleModelViewer = lazy(() => import('../components/garage/VehicleModelViewer'));

import { Plus, Car, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { DetailCard, DetailBack, DetailFields } from '../components/ui/DetailChrome';
import { api } from './api';
import { resolvePaintColour } from '../features/garage/paintColours';
import { useResource } from './useResource';
import { RoadLoader } from '../components/ui/RoadLoader';
export function VehicleForm({ vehicle, onSave, run }: any) {
  const [busy, setBusy] = useState(false);
  const [colourName, setColourName] = useState(vehicle?.paintColorName || ''),
    [colour, setColour] = useState(vehicle?.paintColor || '#b8bcc2');
  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        const values = Object.fromEntries(new FormData(event.currentTarget));
        await run(
          async () => {
            await api(`/vehicles${vehicle ? '/' + vehicle.id : ''}`, vehicle ? 'PATCH' : 'POST', {
              ...values,
              year: Number(values.year),
              mileage: Number(values.mileage),
              licenceDiscExpiry: values.licenceDiscExpiry || null,
              nextServiceDate: values.nextServiceDate || null,
              ...(vehicle ? { version: vehicle.version } : {}),
            });
            onSave();
          },
          vehicle ? 'Vehicle updated.' : 'Vehicle added.',
        );
        setBusy(false);
      }}
    >
      {['make', 'model', 'variant', 'registration'].map((name) => (
        <label key={name}>
          {
            (
              {
                make: 'Make',
                model: 'Model',
                variant: 'Variant / trim',
                registration: 'Registration',
                paintColorName: 'Paint colour',
              } as any
            )[name]
          }
          <input
            name={name}
            defaultValue={vehicle?.[name] || ''}
            required={['make', 'model', 'registration'].includes(name)}
          />
        </label>
      ))}
      <label>
        Year
        <input
          name="year"
          type="number"
          min={1900}
          max={new Date().getFullYear() + 1}
          defaultValue={vehicle?.year || new Date().getFullYear()}
          required
        />
      </label>
      <label>
        Mileage (km)
        <input name="mileage" type="number" min={0} defaultValue={vehicle?.mileage || 0} required />
      </label>
      <label>
        Paint colour
        <input
          name="paintColorName"
          value={colourName}
          onChange={(e) => {
            setColourName(e.target.value);
            const hex = resolvePaintColour(e.target.value);
            if (hex) setColour(hex);
          }}
          placeholder="For example, Silver"
        />
      </label>
      <label>
        Paint preview
        <input
          name="paintColor"
          type="color"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
        />
      </label>
      <label>
        Licence disc expiry
        <input
          name="licenceDiscExpiry"
          type="date"
          defaultValue={vehicle?.licenceDiscExpiry?.slice(0, 10) || ''}
        />
      </label>
      <label>
        Next service
        <input
          name="nextServiceDate"
          type="date"
          defaultValue={vehicle?.nextServiceDate?.slice(0, 10) || ''}
        />
      </label>
      <button className="primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save vehicle'}
      </button>
    </form>
  );
}
export function LiveVehicles({ vehicleId, revision, run, go, refresh }: any) {
  const { data, loading, error } = useResource(
    vehicleId ? `/vehicles/${vehicleId}` : '/vehicles',
    revision,
  );
  const [adding, setAdding] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const { data: related, error: relatedError } = useResource(
    vehicleId ? '/bookings?take=100' : null,
    revision,
  );
  const [modelFailed, setModelFailed] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const vehicles = Array.isArray(data) ? data : [];
  const selected = vehicles.find((vehicle: any) => vehicle.id === selectedId) || vehicles[0];
  const { data: selectedDetails, error: selectedError } = useResource(
    !vehicleId && selected ? `/vehicles/${selected.id}` : null,
    revision,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (adding && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [adding]);
  useEffect(() => setModelFailed(false), [selected?.id]);
  function nextVehicle(direction: number) {
    const index = vehicles.findIndex((vehicle: any) => vehicle.id === selected?.id);
    setSelectedId(vehicles[(index + direction + vehicles.length) % vehicles.length].id);
  }
  if (error)
    return (
      <>
        <WorkspaceHeading title="My Garage" />
        <EmptyState title="Could not load your garage" text={error} />
      </>
    );
  if (!data) return <RoadLoader label="Loading your garage…" />;
  if (vehicleId)
    return (
      <>
        <VehiclePage
          live
          vehicleId={vehicleId}
          go={go}
          setDialog={setDetailDialog}
          data={{
            vehicles: [{ ...data, archived: Boolean(data.archivedAt) }],
            jobs: (related || [])
              .filter((j: any) => j.vehicleId === vehicleId)
              .map((j: any) => ({ ...bookingCardData(j), vehicleId: j.vehicleId })),
            records: (data.history || []).map((r: any) => ({
              ...r,
              vehicleId,
              date: r.createdAt,
              title: 'Completed service',
            })),
          }}
        />
        {relatedError ? (
          <p role="alert">Related bookings could not be loaded: {relatedError}</p>
        ) : null}
        {detailDialog ? (
          <LiveDialog
            title={detailDialog.kind === 'vehicle' ? 'Edit vehicle' : 'Archive vehicle'}
            onClose={() => setDetailDialog(null)}
          >
            {detailDialog.kind === 'vehicle' ? (
              <VehicleForm
                vehicle={data}
                run={run}
                onSave={() => {
                  setDetailDialog(null);
                  refresh();
                }}
              />
            ) : (
              <>
                <p>
                  Remove this vehicle from the showroom? Its bookings and service records will be
                  kept.
                </p>
                <div className="button-row">
                  <button
                    className="primary"
                    onClick={() =>
                      run(async () => {
                        await api('/vehicles/' + data.id, 'DELETE');
                        go('dashboard/garage');
                      }, 'Vehicle archived. Service records kept.')
                    }
                  >
                    Archive vehicle
                  </button>
                  <button className="secondary" onClick={() => setDetailDialog(null)}>
                    Keep vehicle
                  </button>
                </div>
              </>
            )}
          </LiveDialog>
        ) : null}
      </>
    );
  return (
    <>
      <WorkspaceHeading
        title="My Garage"
        action={
          <button className="primary" type="button" onClick={() => setAdding(true)}>
            Add vehicle <Plus size={17} />
          </button>
        }
      />
      {adding ? (
        <dialog
          ref={dialog}
          className="modal live-vehicle-dialog"
          aria-labelledby="add-vehicle-title"
          onCancel={() => setAdding(false)}
          onClose={() => setAdding(false)}
        >
          <button
            className="close"
            type="button"
            aria-label="Close add vehicle"
            onClick={() => setAdding(false)}
          >
            <X />
          </button>
          <h2 id="add-vehicle-title">Add your vehicle</h2>
          <p>Keep its bookings, service history and reminders together.</p>
          <VehicleForm
            run={run}
            onSave={() => {
              setAdding(false);
              refresh();
            }}
          />
        </dialog>
      ) : null}
      {!selected ? (
        <Card as="section" className="dash-panel showroom-empty live-garage-empty">
          <span className="live-empty-car" aria-hidden="true">
            <Car size={70} strokeWidth={1} />
          </span>
          <h2>Your garage is empty</h2>
          <p>Add a vehicle to keep its records, bookings, and reminders together.</p>
          <button className="primary" type="button" onClick={() => setAdding(true)}>
            Add your first vehicle <Plus size={17} />
          </button>
        </Card>
      ) : (
        <>
          <section className="showroom" aria-label="Garage showroom">
            <div className="vehicle-stage live-showroom-stage">
              {!selectedDetails && !selectedError ? (
                <RoadLoader label="Loading your vehicle…" />
              ) : selectedDetails?.modelAsset?.modelUrl && !modelFailed ? (
                <Suspense fallback={<RoadLoader label="Loading your vehicle…" />}>
                  <VehicleModelViewer
                    key={selected.id}
                    src={selectedDetails.modelAsset.modelUrl}
                    paintColor={selected.paintColor || '#b8bcc2'}
                    paintMaterials={selectedDetails.modelAsset.paintMaterials || []}
                    label={`${selected.make} ${selected.model}`}
                    onFail={() => setModelFailed(true)}
                  />
                </Suspense>
              ) : (
                <div className="vehicle-fallback">
                  <Car size={140} strokeWidth={0.8} aria-hidden="true" />
                  <h2>
                    {selected.year} {selected.make} {selected.model}
                  </h2>
                  <p className="model-caption">
                    {selectedError
                      ? 'Vehicle preview could not be loaded.'
                      : modelFailed
                        ? 'The vehicle model could not be loaded.'
                        : 'Vehicle illustration · An exact 3D model is not available yet.'}
                  </p>
                </div>
              )}
              {selectedDetails?.modelAsset ? (
                <div className="vehicle-stage-meta">
                  <p className="model-caption">
                    {selectedDetails.modelAsset.attribution} · {selectedDetails.modelAsset.licence}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="showroom-nav">
              <button
                type="button"
                className="showroom-arrow"
                aria-label="Previous vehicle"
                disabled={vehicles.length < 2}
                onClick={() => nextVehicle(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => go('dashboard/garage/' + selected.id)}
              >
                View details
              </button>
              <button
                type="button"
                className="showroom-arrow"
                aria-label="Next vehicle"
                disabled={vehicles.length < 2}
                onClick={() => nextVehicle(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </section>
          <div className="garage-cards" aria-label="Your vehicles">
            {vehicles.map((vehicle: any) => (
              <button
                key={vehicle.id}
                type="button"
                className={'garage-card' + (selected.id === vehicle.id ? ' selected' : '')}
                aria-pressed={selected.id === vehicle.id}
                aria-label={`Select ${vehicle.year} ${vehicle.make} ${vehicle.model}, ${vehicle.registration}`}
                onClick={() => setSelectedId(vehicle.id)}
              >
                <Car className="garage-card-silhouette" size={90} strokeWidth={1} />
                <span>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {loading ? <p role="status">Updating…</p> : null}
    </>
  );
}
