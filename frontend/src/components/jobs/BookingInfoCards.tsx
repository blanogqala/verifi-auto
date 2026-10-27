import type { ReactNode } from 'react';
import { CalendarDays, CarFront, Clock3, Mail, MapPin, Phone, ShieldCheck, Star, UserRound, Wrench, ArrowUpRight, MessageSquareText, Wallet } from 'lucide-react';
import { DetailCard, DetailFields } from '../ui/DetailChrome';
import { QuoteSummary } from './QuoteSummary';
import { bookingQuotations } from '../../features/jobs/bookingQuotes';
import { formatZar, quoteTotalCents } from '../../features/jobs/quotations';
import { formatDay, formatWhen } from '../../features/jobs/bookingProgress';
import { messagesForBooking } from '../../features/messages/conversation';

const present = (value: unknown, fallback = 'Not recorded') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

function bookingType(job: any) {
  return job.kind === 'EMERGENCY' ? 'Emergency roadside assistance' : 'Vehicle assessment / repair';
}

function bookingWhen(job: any) {
  if (job.kind === 'EMERGENCY') return 'Immediate request · no scheduled arrival';
  return `${job.date ? formatDay(job.date) : 'Date not recorded'}${job.time ? ' at ' + job.time : ''}`;
}

function ContactLine({ Icon, label, value, href }: { Icon: typeof Phone; label: string; value?: string; href?: string }) {
  return (
    <div className="booking-contact-line">
      <span className="booking-contact-icon"><Icon size={17} aria-hidden="true" /></span>
      <span className="booking-contact-copy"><small>{label}</small>
        {href && value ? <a href={href}>{value}</a> : <strong>{present(value, 'Not provided')}</strong>}
      </span>
    </div>
  );
}

export function BookingRequestCard({
  job, title = 'Appointment', vehicle, showVehicle = false, onViewVehicle, children,
}: { job: any; title?: string; vehicle?: any; showVehicle?: boolean; onViewVehicle?: () => void; children?: ReactNode }) {
  const vehicleName = [vehicle?.year ?? job.vehicleYear, vehicle?.make ?? job.vehicleMake, vehicle?.model ?? job.vehicleModel]
    .filter(Boolean).join(' ') || job.vehicleLabel || job.vehicle || 'Not recorded';
  return (
    <DetailCard title={title} icon={<CalendarDays size={22} aria-hidden="true" />}>
      <div className="booking-detail-stack">
        <div className="booking-request-highlight">
          <span className="booking-detail-eyebrow"><Wrench size={14} aria-hidden="true" /> What the customer needs</span>
          <p>{present(job.description, 'No request description was supplied.')}</p>
        </div>
        <div className="booking-meta-strip">
          <span><Wrench size={16} aria-hidden="true" />{bookingType(job)}</span>
          <span><Clock3 size={16} aria-hidden="true" />{bookingWhen(job)}</span>
        </div>
        <DetailFields items={[
          { label: 'Requested on', value: job.createdAt ? formatWhen(job.createdAt) : 'Not recorded' },
          ...(job.kind === 'EMERGENCY' ? [
            { label: 'Breakdown type', value: present(job.emergencyType) },
            { label: 'Roadside location', value: present(job.roadsideAddress) },
          ] : []),
          ...(showVehicle ? [
            { label: 'Vehicle', value: vehicleName },
            { label: 'Registration', value: present(vehicle?.registration || job.registration) },
          ] : []),
        ]} />
        {job.kind !== 'EMERGENCY' && <p className="booking-detail-hint">The preferred appointment time is not a confirmed arrival time.</p>}
        {onViewVehicle && <div className="booking-detail-actions"><button type="button" className="secondary" onClick={onViewVehicle}>View vehicle <ArrowUpRight size={16}/></button></div>}
        {children}
      </div>
    </DetailCard>
  );
}

export function ProfessionalDetailsCard({ job, professional, onView }: {
  job: any; professional?: any; onView?: () => void;
}) {
  const name = present(job.provider || professional?.name, 'Professional not recorded');
  const phone = job.professionalPhone || professional?.phone || '';
  const email = job.professionalEmail || professional?.email || '';
  const ratingValue = professional?.rating;
  const rating = typeof ratingValue === 'number' && Number.isFinite(ratingValue) ? ratingValue : null;
  const count = typeof professional?.reviewCount === 'number' ? professional.reviewCount : null;
  return (
    <DetailCard title="Your professional" icon={<ShieldCheck size={22} aria-hidden="true" />}>
      <div className="booking-detail-stack">
        <div className="booking-person-hero">
          <span className="booking-person-avatar booking-person-avatar-pro">
            {professional?.photo ? <img src={professional.photo} alt="" /> : <Wrench size={28} aria-hidden="true" />}
          </span>
          <span className="booking-person-heading">
            <strong>{name}</strong>
            <small>{present(professional?.type || job.type, 'Automotive professional')}</small>
            {rating != null && (count == null || count > 0)
              ? <span className="booking-rating"><Star size={15} fill="currentColor" /> {rating.toFixed(1)} {count != null ? `· ${count} review${count === 1 ? '' : 's'}` : ''}</span>
              : <span className="booking-rating booking-rating-empty"><Star size={15} /> No reviews yet</span>}
          </span>
        </div>
        <div className="booking-contact-list">
          <ContactLine Icon={Phone} label="Phone number" value={phone} href={phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : undefined} />
          <ContactLine Icon={Mail} label="Email address" value={email} href={email ? 'mailto:' + email : undefined} />
          {(professional?.area || professional?.city || job.city) &&
            <ContactLine Icon={MapPin} label="Service area" value={professional?.area || professional?.city || job.city} />}
        </div>
        {onView && <div className="booking-detail-actions"><button className="secondary" type="button" onClick={onView}>View professional <ArrowUpRight size={16}/></button></div>}
      </div>
    </DetailCard>
  );
}

export function CustomerDetailsCard({ job, customer }: { job: any; customer?: any }) {
  const name = job.customerName || customer?.name || 'Not recorded';
  const phone = job.customerPhone || customer?.phone || '';
  const email = job.customerEmail || customer?.email || '';
  return (
    <DetailCard title="Customer details" icon={<UserRound size={22} aria-hidden="true" />}>
      <div className="booking-detail-stack">
        <div className="booking-person-hero">
          <span className="booking-person-avatar"><UserRound size={27} aria-hidden="true" /></span>
          <span className="booking-person-heading"><strong>{name}</strong><small>Vehicle owner · Booking customer</small></span>
        </div>
        <div className="booking-contact-list">
          <ContactLine Icon={Phone} label="Phone number" value={phone} href={phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : undefined} />
          <ContactLine Icon={Mail} label="Email address" value={email} href={email ? 'mailto:' + email : undefined} />
        </div>
      </div>
    </DetailCard>
  );
}

export function VehicleDetailsCard({ job, vehicle, onView }: { job: any; vehicle?: any; onView?: () => void }) {
  const year = vehicle?.year ?? job.vehicleYear;
  const make = vehicle?.make ?? job.vehicleMake;
  const model = vehicle?.model ?? job.vehicleModel;
  const name = [year, make, model].filter(Boolean).join(' ') || job.vehicleLabel || job.vehicle || 'Not recorded';
  const mileage = vehicle?.mileage ?? job.vehicleMileage;
  return (
    <DetailCard title="Vehicle info" icon={<CarFront size={22} aria-hidden="true" />}>
      <div className="booking-detail-stack">
        <div className="booking-vehicle-heading">
          <span className="booking-person-avatar booking-vehicle-avatar"><CarFront size={28} aria-hidden="true" /></span>
          <span><strong>{name}</strong><small>Vehicle on this booking</small></span>
        </div>
        <DetailFields items={[
          { label: 'Registration', value: present(vehicle?.registration || job.registration) },
          { label: 'Make', value: present(make) },
          { label: 'Model', value: present(model) },
          { label: 'Model year', value: year || 'Not recorded' },
          { label: 'Mileage', value: mileage == null ? 'Not recorded' : Number(mileage).toLocaleString('en-ZA') + ' km' },
        ]} />
        {onView && <div className="booking-detail-actions"><button type="button" className="secondary" onClick={onView}>View vehicle <ArrowUpRight size={16}/></button></div>}
      </div>
    </DetailCard>
  );
}

/** Admin can inspect scoped booking communication, but never send or mark messages as a participant. */
export function ReadOnlyBookingMessages({ data, job }: { data: any; job: any }) {
  const messages = messagesForBooking(data, job.id);
  return (
    <DetailCard title="Booking messages" icon={<MessageSquareText size={21} aria-hidden="true" />}>
      <p className="booking-detail-hint">Read-only conversation between this customer and professional. Administrators cannot reply on their behalf.</p>
      <div className="booking-admin-messages">
        {messages.length ? messages.map((message: any) => (
          <article key={message.id} className="booking-admin-message">
            <div className="booking-admin-message-top">
              <strong>{present(message.senderName, message.senderRole === 'mechanic' ? 'Professional' : 'Customer')}</strong>
              <span>{message.senderRole === 'mechanic' ? 'Professional' : 'Customer'}</span>
              <time dateTime={message.createdAt}>{formatWhen(message.createdAt) || 'Time not recorded'}</time>
            </div>
            <p>{message.body}</p>
          </article>
        )) : <p className="muted">No messages have been exchanged for this booking.</p>}
      </div>
    </DetailCard>
  );
}

/** Reuse the same quote data as both participants, without approval/payment/edit controls. */
export function AdminBookingQuotations({ job }: { job: any }) {
  const quotes = bookingQuotations(job).filter((quote: any) => quote.items?.length || quote.quoteDraft?.items?.length);
  if (!quotes.length) return <DetailCard title="Quotes & payments" icon={<Wallet size={21} />}><p>No quotation has been issued for this booking.</p></DetailCard>;
  return (
    <div className="booking-admin-quotes">
      <div className="booking-quote-summary-strip">
        <span>{quotes.length} quotation{quotes.length === 1 ? '' : 's'}</span>
        <span>Approved: <strong>{formatZar(quotes.filter((q: any) => q.quoteApproved).reduce((total: number, q: any) => total + quoteTotalCents(q.items || []), 0))}</strong></span>
        <span>Recorded paid: <strong>{formatZar(quotes.filter((q: any) => q.paid).reduce((total: number, q: any) => total + quoteTotalCents(q.items || []), 0))}</strong></span>
      </div>
      <div className="quotation-cards-grid">
        {quotes.map((quote: any) => (
          <DetailCard key={quote.quoteId} title={`Quotation ${quote.quoteNumber}`} icon={<Wallet size={20} aria-hidden="true" />}>
            <div className="booking-quotation-state">
              <span>{quote.paid ? (quote.testPayment ? 'Test payment recorded' : 'Payment recorded') : quote.quoteApproved ? 'Customer approved' : quote.status || 'Draft'}</span>
              <strong>{formatZar(quoteTotalCents(quote.items || []))}</strong>
            </div>
            <QuoteSummary job={quote} title="Repairs and charges" />
            {quote.paid && <p className="booking-detail-hint">Payment reference: {quote.paymentReference || 'Not recorded'}{quote.paidAt ? ` · ${formatWhen(quote.paidAt)}` : ''}</p>}
          </DetailCard>
        ))}
      </div>
      <p className="booking-detail-hint">Read-only records. Payments are identified by their recorded state; a test payment does not represent actual money received.</p>
    </div>
  );
}
