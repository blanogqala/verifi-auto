import { type KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import type { AppointmentSection } from '../../config/navigation';
import { resolveVehicleAsset } from '../../features/garage/assetResolution';
import { vehicleCardImage } from '../../features/garage/garageSelection';
import { formatDay } from '../../features/jobs/bookingProgress';
import {
  bookingReference,
  isCancelledRequest,
  isPendingRequest,
  isRejectedRequest,
} from '../../features/jobs/jobViews';

const tabs: { id: AppointmentSection; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

function VehicleArt({ image }: { image: string }) {
  if (image) return <img src={image} alt="" />;
  return (
    <svg className="garage-card-silhouette" viewBox="0 0 200 96" aria-hidden="true">
      <path d="M34 58h132c6 0 10 4 10 8v2H24v-2c0-4 4-8 10-8z" />
      <path d="M52 58 70 38c2-3 6-6 10-6h48c5 0 9 2 12 6l16 20" />
      <circle cx="68" cy="70" r="8" />
      <circle cx="138" cy="70" r="8" />
    </svg>
  );
}

function appointmentImage(job: any, vehicles: any[]) {
  const vehicle = (vehicles || []).find((item) => item?.id && item.id === job?.vehicleId);
  if (!vehicle) return '';
  return vehicleCardImage(resolveVehicleAsset(vehicle));
}

/** Requests waiting on the mechanic. Accepted work stays on Jobs. */
export function AppointmentsPage({
  customerName,
  jobs,
  onOpen,
  route,
  section,
  vehicles = [],
  live = false,
}: any) {
  const pending = jobs.filter(isPendingRequest);
  const rejected = jobs.filter(isRejectedRequest);
  const cancelled = jobs.filter(isCancelledRequest);
  const counts: Record<AppointmentSection, number> = {
    pending: pending.length,
    rejected: rejected.length,
    cancelled: cancelled.length,
  };
  const visible = section === 'rejected' ? rejected : section === 'cancelled' ? cancelled : pending;

  function onTabsKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = Math.max(
      0,
      tabs.findIndex((tab) => tab.id === section),
    );
    const next =
      event.key === 'ArrowRight'
        ? tabs[(index + 1) % tabs.length]
        : event.key === 'ArrowLeft'
          ? tabs[(index - 1 + tabs.length) % tabs.length]
          : event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[tabs.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    route('appointments/' + next.id);
  }

  return (
    <div className="mechanic-appointments">
      <div
        className="profile-tablist folder-tabs"
        role="tablist"
        aria-label="Appointment requests"
        onKeyDown={onTabsKey}
      >
        {tabs.map((tab) => {
          const selected = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={'appointment-tab-' + tab.id}
              className={selected ? 'selected' : ''}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => route('appointments/' + tab.id)}
            >
              {tab.label}
              <i className="folder-count">{counts[tab.id]}</i>
            </button>
          );
        })}
      </div>
      {visible.length ? (
        <div className="appointment-grid">
          {visible.map((job: any) => {
            const vehicleName = job.vehicleLabel || job.vehicle || 'Vehicle not recorded';
            const when = `${job.date ? formatDay(job.date) : 'Date not recorded'}${job.time ? ` at ${job.time}` : ''}`;
            const registration =
              (vehicles || []).find((item: any) => item.id === job.vehicleId)?.registration ||
              job.registration ||
              '';
            return (
              <Card as="article" className="job-card booking-card appointment-card" key={job.id}>
                <button
                  type="button"
                  className="booking-card-hit appointment-hit"
                  onClick={() => onOpen(job)}
                  aria-label={`Open appointment ${bookingReference(job)}, ${vehicleName}`}
                >
                  <span className="booking-card-art">
                    <VehicleArt
                      image={
                        live
                          ? vehicles.find((v: any) => v.id === job.vehicleId)?.modelAsset
                              ?.previewUrl || ''
                          : appointmentImage(job, vehicles)
                      }
                    />
                  </span>
                  <span className="booking-card-copy">
                    <strong>{vehicleName}</strong>
                    <span>{customerName(job)}</span>
                    <span>{when}</span>
                    {registration ? <span>{registration}</span> : null}
                    <span className="reference">{bookingReference(job)}</span>
                    {job.rejectionReason ? <span>Reason: {job.rejectionReason}</span> : null}
                  </span>
                  <Status value={job.status} />
                  <ArrowRight className="booking-card-arrow" size={18} aria-hidden="true" />
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            section === 'rejected'
              ? 'No rejected requests'
              : section === 'cancelled'
                ? 'No cancelled requests'
                : 'No pending requests'
          }
          text={
            section === 'pending'
              ? 'New assessment requests appear here until you accept or reject them.'
              : section === 'rejected'
                ? 'Requests you reject, with the reason you gave, stay here.'
                : 'Requests cancelled before you accept them appear here.'
          }
        />
      )}
    </div>
  );
}
