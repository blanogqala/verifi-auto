import { useEffect, useState } from 'react';
import { Siren, MapPin, ClipboardList, History } from 'lucide-react';
import { api } from '../../data-access/api';
import { WorkReportEditor, WorkReportViewer, VarHistoryViewer } from '../../components/jobs/VehicleActivityRecord';
import { appendNotification } from '../../features/notifications/inbox';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../../components/ui/DetailChrome';
import { DetailPanel, DetailTabs } from '../../components/ui/DetailTabs';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { BookingProgress } from '../../components/jobs/BookingProgress';
import { JobConversation } from '../../components/jobs/JobConversation';
import { BookingRequestCard, CustomerDetailsCard, VehicleDetailsCard } from '../../components/jobs/BookingInfoCards';
import { BookingQuotations } from '../../components/jobs/BookingQuotations';
import { merchantIdentityLabel } from '../../features/account/customerIdentity';
import { customerNameForJob, customerRecords } from '../../features/admin/customerRecords';
import { formatDay, formatWhen } from '../../features/jobs/bookingProgress';
import { bookingReference } from '../../features/jobs/jobViews';
import { pricingNote } from '../../features/jobs/pricingModel';
import { sharedRecordsForProfessional } from '../../features/garage/historyAccess';
import { activeMechanicProfessionalId } from '../../features/identity/participants';
import { unreadMessageCount } from '../../features/messages/conversation';

export function JobDetailPage({ data, go, job, notify, onAction, panel, route, update, live = false, refresh = () => {} }: any) {
  const [tab, setTab] = useState(panel || 'overview');
  const [editorOpen, setEditorOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [varRecords, setVarRecords] = useState<any[]>([]);
  const [varBusy, setVarBusy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bookingId = job?.id || '';
  useEffect(() => {
    setTab(panel || 'overview');
  }, [bookingId, panel]);
  useEffect(() => {
    setEditorOpen(false);
    setReportOpen(false);
    setVarOpen(false);
    setError('');
    setBusy(false);
  }, [bookingId]);
  if (!job) {
    return (
      <div className="detail-page">
        <DetailBack label="Back to Jobs" onClick={() => route('jobs')} />
        <Card as="section" className="dash-panel">
          <h1>Job unavailable</h1>
          <p>This job is not assigned to your workshop in this browser.</p>
        </Card>
      </div>
    );
  }
  const professionalId = activeMechanicProfessionalId(data);
  const people = customerRecords(data);
  const customer = job.customerName || customerNameForJob(job, people);
  const customerRecord = people.find((item: any) => item.id === job.customerId);
  const vehicle = (data.vehicles || []).find((item: any) => item.id === job.vehicleId);
  const registration = vehicle?.registration || job.registration || 'Not recorded';
  const history = sharedRecordsForProfessional(data, job, professionalId);
  const unread = unreadMessageCount(data, job.id, 'mechanic');
  const varGrant = (data.historyAccess || []).find((grant: any) => grant.bookingId === job.id);
  const varGranted = varGrant?.status === 'active';
  const varPending = varGrant?.status === 'requested';
  const canRequestVar = ['Confirmed', 'Awaiting approval', 'Changes requested', 'Approved', 'In progress', 'Awaiting payment'].includes(job.status);
  async function saveWorkReport(values: { checkedLineIds: string[]; notes: string; mileage: number }) {
    const reportItems = [
      ...(job.quoteApproved ? [{ quoteNumber: 1, items: job.items }] : []),
      ...(job.additionalQuotes || []).filter((q: any) => q.quoteApproved),
    ].flatMap((quote: any) => (quote.items || []).filter((item: any) => item.approved !== false && item.id).map((item: any) => ({
      id: item.id, description: item.name || item.description, quoteNumber: quote.quoteNumber || 1,
      completed: values.checkedLineIds.includes(item.id), quantity: item.quantity || 1,
    })));
    if (live) {
      await api('/bookings/' + encodeURIComponent(job.id) + '/work-report', 'PUT', { ...values, version: job.version });
      refresh();
    } else {
      const now = new Date().toISOString();
      const result = update((current: any) => ({
        ...current,
        jobs: (current.jobs || []).map((entry: any) => entry.id === job.id
          ? { ...entry, workReport: { items: reportItems, notes: values.notes, mileage: values.mileage, updatedAt: now }, workReportUpdatedAt: now }
          : entry),
      }));
      if (result === false) throw Error('Could not save the work report.');
      if (result instanceof Promise) await result;
    }
    notify('Work report saved to this booking and the vehicle history.');
  }
  async function requestVar() {
    if (varBusy || !canRequestVar) return;
    setVarBusy(true); setError('');
    try {
      if (live) {
        await api('/bookings/' + encodeURIComponent(job.id) + '/var-request', 'POST', {});
        refresh();
      } else {
        const current = data.historyAccess || [];
        const next = {
          id: 'grant-' + job.id, bookingId: job.id,
          customerId: job.customerId, professionalId, vehicleId: job.vehicleId,
          recordIds: [], status: 'requested', requestedAt: new Date().toISOString(),
        };
        const saved = update((state: any) => appendNotification({
          ...state, historyAccess: [next, ...(state.historyAccess || []).filter((grant: any) => grant.bookingId !== job.id)],
        }, { recipientRole: 'customer', recipientId: job.customerId, type: 'account',
          title: 'Workshop requested VAR access', message: 'Review the Vehicle Activity Record access request in your booking.',
          bookingId: job.id, panel: 'overview', createdAt: new Date().toISOString() }));
        if (saved === false) throw Error('Could not save the request.');
        if (saved instanceof Promise) await saved;
      }
      notify('VAR access requested. The customer must approve which service records you can see.');
    } catch (reason: any) { setError(reason?.message || 'Could not request VAR access.'); }
    finally { setVarBusy(false); }
  }
  async function viewVar() {
    setVarBusy(true); setError('');
    try {
      const records = live
        ? await api<any[]>('/bookings/' + encodeURIComponent(job.id) + '/history')
        : sharedRecordsForProfessional(data, job, professionalId);
      setVarRecords(records);
      setVarOpen(true);
    } catch (reason: any) { setError(reason?.message || 'Could not load shared vehicle records.'); }
    finally { setVarBusy(false); }
  }

  function choose(next: string) {
    setTab(next);
    route(next === 'overview' ? `jobs/${encodeURIComponent(job.id)}` : `jobs/${encodeURIComponent(job.id)}/${next}`);
  }
  function run(action: string, extra: any = {}) {
    if (busy) return false;
    setBusy(true);
    setError('');
    const saved = onAction(job, action, extra);
    setBusy(false);
    if (!saved) setError('Could not save this change.');
    return !!saved;
  }

  return (
    <div className="detail-page mechanic-job-detail">
      <DetailBack label="Back to Jobs" onClick={() => go('dashboard/jobs')} />
      <DetailHeader
        kicker={bookingReference(job)}
        title={job.vehicleLabel || job.vehicle || 'Job'}
        summary={
          <span>
            {customer}
            {' · '}
            {job.date ? formatDay(job.date) : 'Date not recorded'}
            {job.time ? ` at ${job.time}` : ''}
          </span>
        }
        aside={<Status value={job.status} />}
      />
      {job.kind === 'EMERGENCY' && <div className="roadside-detail-banner"><strong><Siren size={19}/> EMERGENCY ROADSIDE JOB</strong><span>{job.emergencyType || 'Breakdown'} · <MapPin size={13} style={{ display: 'inline' }} /> {job.roadsideAddress || 'Location not provided'}</span>{job.roadsideLatitude != null && job.roadsideLongitude != null && <a className="roadside-directions" target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(job.roadsideLatitude + ',' + job.roadsideLongitude)}>Open location in Maps</a>}<span>Use Messages to coordinate roadside arrival, tools and next steps.</span></div>}
      <DetailCard title="Progress">
        <BookingProgress job={job} />
      </DetailCard>
      <DetailTabs
        id="mechanic-job"
        label="Job details"
        value={tab}
        onChange={choose}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quote', label: 'Quotes & payments' },
          { id: 'messages', label: 'Messages', badge: unread || undefined },
        ]}
      />
      <DetailPanel scope="mechanic-job" tabId="overview" value={tab}>
        <div className="split-detail">
          <div className="split-main">
            <BookingRequestCard job={job} title="Customer request">
              <p className="booking-detail-hint">{pricingNote(job)}</p>
              {job.status === 'Confirmed' ? (
                <button className="primary" type="button" onClick={() => choose('quote')}>
                  Prepare quotation
                </button>
              ) : null}
              {job.status === 'Awaiting approval' ? <p>Quotation sent. Waiting for the customer.</p> : null}
              {job.status === 'Changes requested' ? (
                <>
                  <p>Change request: {job.changeRequest || 'The customer asked for a revision.'}</p>
                  <button className="primary" type="button" onClick={() => choose('quote')}>
                    Revise quotation
                  </button>
                </>
              ) : null}
              {job.status === 'Approved' ? (
                <button className="primary" type="button" disabled={busy} onClick={() => run('start')}>
                  Start work
                </button>
              ) : null}
              {job.status === 'In progress' ? (
                <div className="var-work-actions">
                  <span className="var-work-in-progress"><ClipboardList size={18}/> Work is in progress</span>
                  <p className="booking-detail-hint">Record completed quotation items, technician notes and vehicle mileage. The work report stays editable until the job is finished.</p>
                  <button className="primary" type="button" onClick={() => setEditorOpen(true)}>
                    {job.workReport ? 'Edit work report' : 'Add completed work'}
                  </button>
                  {job.workReport && <button className="secondary" type="button" onClick={() => setReportOpen(true)}>Review submitted work</button>}
                </div>
              ) : null}
              {job.status === 'Awaiting payment' ? (
                <>
                  <p>Approved quotations still have an outstanding balance.</p>
                  <button className="secondary" type="button" onClick={() => choose('quote')}>
                    View quotation
                  </button>
                </>
              ) : null}
              {job.completionNotes ? <p>Completed work: {job.completionNotes}</p> : null}
              {job.paid ? (
                <p>
                  Demo payment recorded
                  {job.paymentReference ? ` · ${job.paymentReference}` : ''}
                  {job.paidAt ? ` · ${formatWhen(job.paidAt)}` : ''}
                </p>
              ) : null}
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </BookingRequestCard>
          </div>
          <div className="split-side">
            <CustomerDetailsCard job={{ ...job, customerName: customer }} customer={customerRecord} />
            <VehicleDetailsCard job={job} vehicle={vehicle} headerAction={canRequestVar ? (
              <button type="button" className="var-header-action" disabled={varBusy || (varPending && !varGranted)}
                onClick={() => void (varGranted ? viewVar() : requestVar())}>
                <History size={16}/>{varGranted ? 'View VAR' : varPending ? 'VAR pending' : 'Request VAR'}
              </button>
            ) : undefined} />
            {history.length ? (
              <DetailCard quiet title="Service history">
                {history.map((record: any) => (
                  <p key={record.id}>
                    {record.title || 'Service record'}
                    {record.date ? ` · ${formatDay(record.date)}` : ''}
                  </p>
                ))}
              </DetailCard>
            ) : (
              <p className="muted">No service history has been shared for this booking.</p>
            )}
          </div>
        </div>
      </DetailPanel>
      <DetailPanel scope="mechanic-job" tabId="quote" value={tab}>
        <BookingQuotations key={job.id} job={job} mechanic actor={{ role: 'mechanic', id: professionalId }} update={update} notify={notify} onAction={onAction} />
      </DetailPanel>
      <DetailPanel scope="mechanic-job" tabId="messages" value={tab}>
        <DetailCard title="Messages">
          <JobConversation
            active={tab === 'messages'}
            bookingId={job.id}
            data={data}
            job={job}
            notify={notify}
            update={update}
            viewerId={professionalId}
            viewerName={merchantIdentityLabel(data.profile?.name)}
            viewerRole="mechanic"
          />
        </DetailCard>
      </DetailPanel>
      {editorOpen && <WorkReportEditor job={job} onSave={saveWorkReport} onClose={() => setEditorOpen(false)} />}
      {reportOpen && job.workReport && <WorkReportViewer report={job.workReport} workshop={job.provider} onClose={() => setReportOpen(false)} />}
      {varOpen && <VarHistoryViewer records={varRecords} onClose={() => setVarOpen(false)} />}
    </div>
  );
}
