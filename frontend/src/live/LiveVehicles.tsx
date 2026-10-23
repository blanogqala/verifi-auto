import { GaragePage } from '../pages/customer/GaragePage';
import { VehicleStage } from '../components/garage/VehicleStage';
import { VehicleFields } from '../components/garage/VehicleFields';
import { Check } from 'lucide-react';
import { VehiclePage } from '../pages/customer/VehiclePage';
import { LiveDialog } from './LiveDialog';
import { bookingCardData } from './LiveWorkspaceViews';
import { useState } from 'react';

import { Plus } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { api } from './api';
import { useResource } from './useResource';
import { RoadLoader } from '../components/ui/RoadLoader';
export function VehicleForm({ vehicle, onSave, run }: any) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        const values = Object.fromEntries(new FormData(event.currentTarget));
        await run(
          async () => {
            const saved = await api(
              `/vehicles${vehicle ? '/' + vehicle.id : ''}`,
              vehicle ? 'PATCH' : 'POST',
              {
                ...values,
                year: Number(values.year),
                mileage: Number(values.mileage),
                nextServiceMileage:
                  values.nextServiceMileage === '' ? null : Number(values.nextServiceMileage),
                licenceDiscExpiry: values.licenceDiscExpiry || null,
                nextServiceDate: values.nextServiceDate || null,
                ...(vehicle ? { version: vehicle.version } : {}),
              },
            );
            onSave(saved);
          },
          vehicle ? 'Vehicle updated.' : 'Vehicle added.',
        );
        setBusy(false);
      }}
    >
      <p className="muted">Enter the vehicle details you want to keep with this garage.</p>
      <VehicleFields vehicle={vehicle} />
      <button className="primary full" disabled={busy}>
        {busy ? 'Saving…' : 'Save vehicle'} <Check size={17} />
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
  const vehicles = Array.isArray(data) ? data : [];
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
        <LiveDialog title="Add vehicle" onClose={() => setAdding(false)}>
          <VehicleForm
            run={run}
            onSave={() => {
              setAdding(false);
              refresh();
            }}
          />
        </LiveDialog>
      ) : null}
      <GaragePage
        data={{ vehicles, jobs: [], records: [] }}
        go={go}
        setDialog={setDetailDialog}
        connected={{
          renderStage: (vehicle: any) => (
            <ConnectedVehicleStage key={vehicle.id} vehicle={vehicle} revision={revision} />
          ),
        }}
      />
      {loading ? <p role="status">Updating…</p> : null}
    </>
  );
}

function ConnectedVehicleStage({ vehicle, revision }: any) {
  const { data, error } = useResource('/vehicles/' + vehicle.id, revision);
  if (!data && !error)
    return (
      <div className="vehicle-stage">
        <RoadLoader label="Loading your vehicle…" />
      </div>
    );
  const model = data?.modelAsset;
  return (
    <VehicleStage
      vehicle={vehicle}
      resolved={{
        status: model ? 'exact' : 'unavailable',
        label: error
          ? 'Vehicle preview could not be loaded.'
          : model
            ? 'Verified vehicle model'
            : 'Vehicle illustration · An exact 3D model is not available yet.',
        asset: model
          ? {
              ...model,
              src: model.modelUrl,
              source: model.sourceUrl || '',
              attribution: model.attribution,
            }
          : null,
      }}
    />
  );
}
