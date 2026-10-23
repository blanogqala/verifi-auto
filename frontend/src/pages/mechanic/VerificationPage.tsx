import { Card } from '../../components/ui/Card';
import { ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { canSubmit } from '../../demo';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Mechanic-facing plain-language checklist; never claims that an upload is approved. */
export function VerificationPage({ data, note, notify, route, update, connected }: any) {
  const status = data.application?.status || 'Draft';
  const documents: any[] = data.documents || [];
  const doc = (kind: string) => documents.find((item: any) => item.kind === kind);
  const identity = doc('Identity evidence');
  const qualification = doc('Qualifications / experience');
  const profileReady = Boolean(
    data.profile?.name?.trim() && data.profile?.city &&
    data.profile?.phone?.trim() && data.profile?.bio?.trim() && data.profile?.services?.length,
  );
  const ready = connected ? Boolean(connected.canSubmit) : canSubmit(data);
  const submitted = status === 'Pending review';
  const approved = status === 'Approved';
  const changes = status === 'Changes requested';
  const label = status === 'Draft' ? 'Incomplete' : status;
  function reviewLabel(document: any) {
    if (!document) return 'Missing — upload your document';
    if (!connected) return 'Sample evidence added';
    return document.reviewStatus === 'APPROVED' ? 'Approved by Verifi Auto'
      : document.reviewStatus === 'CHANGES_REQUESTED' ? 'Changes requested — replace this document'
      : 'Uploaded — awaiting review';
  }
  return (
    <Card as="section" className="dash-panel application-panel">
      <div className="panel-title">
        <h2>Verification status</h2>
        <Status value={label} />
      </div>
      <p className="muted">
        {approved
          ? 'Your business has been approved and can appear in the professional directory.'
          : submitted
            ? 'Your application has been submitted. The Verifi Auto team is reviewing your business and documents.'
            : changes
              ? 'Some information needs correcting. Read the feedback, update your details or documents, then submit again.'
              : 'Complete your business details and documents, then submit your application for administrator review.'}
      </p>
      <div className="application-checklist">
        {[
          { done: profileReady, title: 'Business profile', info: profileReady ? 'Business details provided' : 'Add your contact details, service areas and services', target: 'profile/business' },
          { done: Boolean(identity), title: 'Identity evidence', info: reviewLabel(identity), target: 'profile/documents' },
          { done: Boolean(qualification), title: 'Qualifications or experience', info: reviewLabel(qualification), target: 'profile/documents' },
        ].map((item) => (
          <button type="button" className="checklist-row" key={item.title}
            data-profile-target={item.target}
            onClick={() => route(item.target)}>
            <span className={item.done ? 'check-circle complete' : 'check-circle'}>
              {item.done ? <Check size={17} /> : <span />}
            </span>
            <div><b>{item.title}</b><small>{item.info}</small></div>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
      {data.application?.note && (
        <div className="notice" role="status">
          <b>Administrator feedback:</b> {data.application.note}
        </div>
      )}
      {['Draft', 'Changes requested', 'Rejected'].includes(status) ? (
        <>
          <button className="primary" type="button" disabled={!ready}
            onClick={() => {
              if (connected) { void connected.submit(); return; }
              commitUpdate(update, (current: any) => note({
                ...current,
                application: { ...current.application, status: 'Pending review', submittedAt: new Date().toISOString().slice(0, 10), note: '' },
              }, 'Your sample application has been submitted for review.'),
                notify, 'Submitted for demo review.');
            }}>
            {changes ? 'Resubmit for review' : 'Submit for review'} <ArrowRight size={17} />
          </button>
          {!ready && <p className="muted">Finish your business profile, identity evidence and qualifications to submit.</p>}
        </>
      ) : approved ? (
        <div className="success-note"><ShieldCheck /> Verified professional account.</div>
      ) : submitted ? (
        <div className="notice">No action is required unless an administrator requests a change.</div>
      ) : (
        <div className="notice">Contact Verifi Auto support about this account's verification status.</div>
      )}
    </Card>
  );
}
