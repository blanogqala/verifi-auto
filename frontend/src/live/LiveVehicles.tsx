import { lazy, Suspense, useState } from 'react';
const VehicleModelViewer = lazy(() => import('../components/garage/VehicleModelViewer'));

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
  const [modelFailed, setModelFailed] = useState(false);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <RoadLoader label="Loading your garage…" />;
  if (vehicleId)
    return (
      <div className="detail-page">
        <DetailBack label="Back to My garage" onClick={() => go('dashboard/garage')} />
        <DetailCard title={`${data.year} ${data.make} ${data.model}`}>
          <DetailFields
            items={[
              { label: 'Registration', value: data.registration },
              { label: 'Mileage', value: `${data.mileage} km` },
              { label: 'Colour', value: data.paintColorName || 'Not recorded' },
            ]}
          />
          <p>
            {data.modelMatch === 'verified'
              ? 'A verified model is available for this exact vehicle specification.'
              : 'An accurate 3D model is not available for this specification yet.'}
          </p>
          {data.modelAsset?.modelUrl && !modelFailed ? (
            <div className="live-model-stage">
              <Suspense fallback={<RoadLoader label="Loading your vehicle…" />}>
                <VehicleModelViewer
                  src={data.modelAsset.modelUrl}
                  paintColor={data.paintColor || '#b8bcc2'}
                  paintMaterials={data.modelAsset.paintMaterials || []}
                  label={`${data.make} ${data.model}`}
                  onFail={() => setModelFailed(true)}
                />
              </Suspense>
            </div>
          ) : null}
          {modelFailed ? (
            <p>The verified model could not be loaded. Please try again later.</p>
          ) : null}
          {data.modelAsset ? (
            <p className="muted">
              {data.modelAsset.attribution} · {data.modelAsset.licence}
            </p>
          ) : null}
          {data.modelAsset?.previewUrl ? (
            <img
              className="live-vehicle-image"
              src={data.modelAsset.previewUrl}
              alt={`${data.make} ${data.model}`}
            />
          ) : null}
          <details className="fold">
            <summary>Edit vehicle</summary>
            <VehicleForm vehicle={data} run={run} onSave={refresh} />
          </details>
          <button
            className="secondary"
            type="button"
            onClick={() =>
              run(async () => {
                await api(`/vehicles/${data.id}`, 'DELETE');
                go('dashboard/garage');
              }, 'Vehicle archived. Service records kept.')
            }
          >
            Archive vehicle
          </button>
        </DetailCard>
        <DetailCard title="Service history">
          {data.history.length ? (
            data.history.map((record: any) => (
              <article key={record.id}>
                <h3>{new Date(record.createdAt).toLocaleDateString()}</h3>
                <p>{record.notes}</p>
              </article>
            ))
          ) : (
            <p>Completed repairs will appear here.</p>
          )}
        </DetailCard>
      </div>
    );
  return (
    <div className="detail-page">
      <div className="button-row">
        <h1>My garage</h1>
        <button className="primary" type="button" onClick={() => setAdding(!adding)}>
          {adding ? 'Close form' : 'Add vehicle'}
        </button>
      </div>
      {adding ? (
        <DetailCard title="Add your vehicle">
          <VehicleForm
            run={run}
            onSave={() => {
              setAdding(false);
              refresh();
            }}
          />
        </DetailCard>
      ) : null}
      <div className="live-card-grid">
        {data.map((vehicle: any) => (
          <button
            type="button"
            className="live-resource-card"
            key={vehicle.id}
            onClick={() => go('dashboard/garage/' + vehicle.id)}
          >
            <span className="live-car-mark" aria-hidden="true">
              ◇
            </span>
            <strong>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </strong>
            <span>{vehicle.registration}</span>
          </button>
        ))}
      </div>
      {!data.length ? <p>Add your first vehicle to book an assessment.</p> : null}
      {loading ? <p role="status">Updating…</p> : null}
    </div>
  );
}
