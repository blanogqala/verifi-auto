import { useState } from 'react';
import { ArrowUpRight, CalendarDays, ClipboardCheck, FileClock, Wrench } from 'lucide-react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { WorkReportViewer, OwnerServiceRecordViewer } from '../jobs/VehicleActivityRecord';
import { vehicleVarEntries, groupByWorkshop, groupedVehicleBookings, type VehicleVarEntry } from '../../features/garage/vehicleTimeline';
import { bookingReference } from '../../features/jobs/jobViews';
import { followDetail } from '../../features/navigation/returnPath';
import { formatDay } from '../../features/jobs/bookingProgress';

function readableDate(value: string) {
  return value ? formatDay(value.slice(0, 10)) : 'Date not recorded';
}

function WorkshopMark() {
  return <span className="garage-workshop-mark" aria-hidden="true"><Wrench size={20}/></span>;
}

/** The owner can inspect both provisional work reports and final recorded services.
 * Group by workshop and avoid showing the same completed booking twice. */
export function GarageVarGallery({ bookings, records }: { bookings: any[]; records: any[] }) {
  const [opened, setOpened] = useState<VehicleVarEntry | null>(null);
  const groups = groupByWorkshop(vehicleVarEntries(bookings, records));
  const count = groups.reduce((total, group) => total + group.entries.length, 0);
  return (
    <Card as="section" className="garage-var-shell">
      <div className="garage-var-heading">
        <div>
          <span className="garage-eyebrow"><ClipboardCheck size={15}/> Vehicle care timeline</span>
          <h2>Vehicle Activity Record <span>(VAR)</span></h2>
          <p>Workshops, service dates and the work recorded on this vehicle.</p>
        </div>
        <span className="garage-var-counter">{count} {count === 1 ? 'entry' : 'entries'}</span>
      </div>
      {groups.length ? (
        <div className="garage-workshop-groups">
          {groups.map((group) => (
            <section className="garage-workshop-group" key={group.key} aria-label={'Service history with ' + group.name}>
              <header className="garage-workshop-head">
                <WorkshopMark/>
                <span><strong>{group.name}</strong><small>{group.entries.length} {group.entries.length === 1 ? 'service record' : 'service records'}</small></span>
              </header>
              <div className="garage-var-entries">
                {group.entries.map((entry) => (
                  <button className="garage-var-entry" type="button" key={entry.id}
                    onClick={() => setOpened(entry)}
                    aria-label={'View service details: ' + group.name + ', ' + readableDate(entry.date)}>
                    <span className="garage-var-entry-icon"><FileClock size={21}/></span>
                    <span className="garage-var-entry-body">
                      <strong>{entry.title}</strong>
                      <small><CalendarDays size={13} aria-hidden="true"/>{readableDate(entry.date)}</small>
                      <span>{entry.description}</span>
                    </span>
                    <span className={'garage-var-entry-status' + (entry.final ? ' final' : '')}>{entry.final ? 'Completed' : 'In progress'}</span>
                    <ArrowUpRight size={18} className="garage-entry-arrow" aria-hidden="true"/>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="garage-var-empty">
          <span className="garage-var-empty-icon"><ClipboardCheck size={27}/></span>
          <div><strong>No workshop service records yet</strong>
            <p>As workshops add work reports, they'll appear here under the workshop's name. Completed services stay in the vehicle's history.</p></div>
        </div>
      )}
      {opened?.kind === 'report' && opened.job?.workReport &&
        <WorkReportViewer report={opened.job.workReport} workshop={opened.workshop} final={opened.final} onClose={() => setOpened(null)}/>}
      {opened?.kind === 'record' &&
        <OwnerServiceRecordViewer record={opened.record} workshop={opened.workshop} onClose={() => setOpened(null)}/>}
    </Card>
  );
}

/** History tab is deliberately booking-focused; each whole row opens the booking. */
export function GarageBookingHistory({ bookings, go, from }: {
  bookings: any[];
  go: (path: string) => void;
  from: string;
}) {
  const groups = groupedVehicleBookings(bookings);
  return (
    <Card as="section" className="garage-bookings-shell">
      <div className="garage-var-heading">
        <div>
          <span className="garage-eyebrow"><CalendarDays size={15}/> Vehicle appointments</span>
          <h2>Booking history</h2>
          <p>All bookings for this vehicle, organised by workshop. Open one to review its details, quotes and messages.</p>
        </div>
        <span className="garage-var-counter">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</span>
      </div>
      {groups.length ? (
        <div className="garage-workshop-groups">
          {groups.map((group) => (
            <section className="garage-workshop-group" key={group.key} aria-label={'Bookings with ' + group.name}>
              <header className="garage-workshop-head">
                <WorkshopMark/>
                <span><strong>{group.name}</strong><small>{group.entries.length} {group.entries.length === 1 ? 'booking' : 'bookings'}</small></span>
              </header>
              <div className="garage-var-entries">
                {group.entries.map((job: any) => (
                  <button type="button" className="garage-var-entry garage-booking-entry" key={job.id}
                    onClick={() => followDetail(go, from, 'dashboard/bookings/' + encodeURIComponent(job.id))}
                    aria-label={'Open booking ' + bookingReference(job) + ' with ' + group.name}>
                    <span className="garage-var-entry-icon"><CalendarDays size={21}/></span>
                    <span className="garage-var-entry-body">
                      <strong>{bookingReference(job)}</strong>
                      <small><CalendarDays size={13} aria-hidden="true"/>{readableDate(job.date || job.createdAt || '')}{job.time ? ' · ' + job.time : ''}</small>
                      <span>{job.description || (job.kind === 'EMERGENCY' ? 'Emergency roadside assistance' : 'Vehicle assessment / repair')}</span>
                    </span>
                    <span className="garage-booking-status"><StatusBadge value={job.status}/></span>
                    <ArrowUpRight size={18} className="garage-entry-arrow" aria-hidden="true"/>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="garage-var-empty">
          <span className="garage-var-empty-icon"><CalendarDays size={27}/></span>
          <div><strong>No bookings for this vehicle yet</strong><p>When you book a professional for this car, your appointments will appear here.</p></div>
        </div>
      )}
    </Card>
  );
}
