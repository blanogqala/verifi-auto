import { VehiclePage } from '../pages/customer/VehiclePage';
import { GaragePage } from '../pages/customer/GaragePage';
import { WorkspaceDialog } from '../components/dialogs/WorkspaceDialog';
import { bookingCardData, WorkspaceHeading } from './LiveWorkspaceViews';
import { Plus } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from './api';
import { useResource } from './useResource';
import { RoadLoader } from '../components/ui/RoadLoader';
import { useState } from 'react';
import { calendarDateOrNull } from '../features/garage/vehicleDates';

const bodyStyles = new Set([
  '',
  'hatchback',
  'sedan',
  'estate',
  'coupe',
  'concept coupe',
  'suv',
  'van',
  'other',
]);

function vehicleBody(vehicle: any, version?: number) {
  const paint = String(vehicle.paintColor || '');
  const style = String(vehicle.bodyStyle || '');
  const serviceMileage = String(vehicle.nextServiceMileage ?? '').trim();
  return {
    make: String(vehicle.make || ''),
    model: String(vehicle.model || ''),
    year: Number(vehicle.year),
    variant: String(vehicle.variant || ''),
    registration: String(vehicle.registration || ''),
    mileage: Number(vehicle.mileage || 0),
    bodyStyle: bodyStyles.has(style) ? style : '',
    paintColorName: String(vehicle.paintColorName || ''),
    paintColor: /^#[0-9a-fA-F]{6}$/.test(paint) ? paint : '',
    licenceDiscExpiry: calendarDateOrNull(vehicle.licenceDiscExpiry),
    nextServiceDate: calendarDateOrNull(vehicle.nextServiceDate),
    nextServiceMileage: serviceMileage === '' ? null : Number(serviceMileage),
    ...(vehicle.id ? { version } : {}),
  };
}

export function LiveVehicles({ vehicleId, revision, run, go, refresh }: any) {
  const { data, error } = useResource(vehicleId ? `/vehicles/${vehicleId}` : '/vehicles', revision);
  const [adding, setAdding] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const { data: related, error: relatedError } = useResource(
    vehicleId ? '/bookings?take=100' : null,
    revision,
  );
  const vehicles = Array.isArray(data) ? data : [];
  const dialog = adding ? { kind: 'vehicle' } : detailDialog;

  function closeDialog(value: any) {
    if (!value) {
      setAdding(false);
      setDetailDialog(null);
      return;
    }
    setDetailDialog(value);
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
              .filter((job: any) => job.vehicleId === vehicleId)
              .map((job: any) => ({ ...bookingCardData(job), vehicleId: job.vehicleId })),
            records: (data.history || []).map((record: any) => ({
              ...record,
              vehicleId,
              date: record.createdAt,
              title: 'Completed service',
            })),
          }}
        />
        {relatedError ? (
          <p role="alert">Related bookings could not be loaded: {relatedError}</p>
        ) : null}
        {detailDialog ? (
          <WorkspaceDialog
            dialog={detailDialog}
            setDialog={closeDialog}
            data={{ settings: { id: data.customerId } }}
            update={() => true}
            notify={() => {}}
            role="customer"
            liveActions={{
              saveVehicle: (vehicle: any) =>
                run(async () => {
                  await api('/vehicles/' + data.id, 'PATCH', vehicleBody(vehicle, data.version));
                  refresh();
                }, 'Vehicle updated.'),
              archiveVehicle: () =>
                run(async () => {
                  await api('/vehicles/' + data.id, 'DELETE');
                  go('dashboard/garage');
                }, 'Vehicle archived. Service records kept.'),
            }}
          />
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
      <GaragePage
        data={{
          vehicles: vehicles.map((vehicle: any) => ({ ...vehicle, archived: false })),
          jobs: [],
          records: [],
        }}
        go={go}
        setDialog={() => setAdding(true)}
      />
      {dialog ? (
        <WorkspaceDialog
          dialog={dialog}
          setDialog={closeDialog}
          data={{ settings: {} }}
          update={() => true}
          notify={() => {}}
          role="customer"
          liveActions={{
            saveVehicle: (vehicle: any) =>
              run(
                async () => {
                  await api('/vehicles', 'POST', vehicleBody(vehicle));
                },
                'Vehicle added.',
              ),
          }}
        />
      ) : null}
    </>
  );
}
