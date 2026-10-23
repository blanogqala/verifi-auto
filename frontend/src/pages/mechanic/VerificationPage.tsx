import { Card } from '../../components/ui/Card';

import { ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { canSubmit } from '../../demo';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';

/** Presentational view. State and actions are supplied by the owning layout. */
export function VerificationPage({
  data,
  name,
  note,
  notify,
  profile,
  route,
  update,
  connected,
}: any) {
  return (
    <Card as="section" className="dash-panel application-panel">
      <div className="panel-title">
        <h2>Your verification journey</h2>
        <Status value={connected && data.application.status === 'Draft' ? 'Incomplete' : data.application.status} />
      </div>
      <p className="muted">
        {connected
          ? 'Your profile stays out of the directory until your application is reviewed and approved.'
          : 'Your profile stays out of the live directory until review and approval. This is a simulated application process.'}
      </p>
      <div className="application-steps">
        {[
          ['1', 'Profile'],
          ['2', 'Evidence'],
          ['3', 'Review'],
          ['4', 'Decision'],
        ].map(([n, t]) => (
          <div key={n}>
            <span>{n}</span>
            <b>{t}</b>
          </div>
        ))}
      </div>
      {[
        [
          !!(
            data.profile.phone &&
            data.profile.bio &&
            data.profile.name &&
            data.profile.services.length
          ),
          'Business profile',
          'Add contact details, service area, expertise, and services.',
          'profile/business',
        ],
        [
          data.documents.some((d: any) => d.kind === 'Identity evidence'),
          'Identity evidence',
          connected
            ? 'Upload your identity evidence securely.'
            : 'Select a non-sensitive sample identity file.',
          'profile/documents',
        ],
        [
          data.documents.some((d: any) => d.kind === 'Qualifications / experience'),
          'Qualifications or experience',
          connected
            ? 'Upload evidence of professional capability.'
            : 'Add sample evidence of professional capability.',
          'profile/documents',
        ],
      ].map(([done, t, desc, target]: any) => (
        <button
          className="checklist-row"
          key={t}
          data-profile-target={target}
          onClick={() => route(target)}
        >
          <span className={done ? 'check-circle complete' : 'check-circle'}>
            {done ? <Check size={17} /> : <span />}
          </span>
          <div>
            <b>{t}</b>
            <small>{desc}</small>
          </div>
          <ArrowRight size={17} />
        </button>
      ))}
      {data.application.note && (
        <div className="notice">
          <b>Reviewer feedback:</b> {data.application.note}
        </div>
      )}
      {['Draft', 'Changes requested', 'Rejected'].includes(data.application.status) ? (
        <>
          <button
            className="primary"
            disabled={connected ? !connected.canSubmit : !canSubmit(data)}
            onClick={() => {
              if (connected) {
                void connected.submit();
                return;
              }
              commitUpdate(
                update,
                (d: any) =>
                  note(
                    {
                      ...d,
                      application: {
                        ...d.application,
                        status: 'Pending review',
                        submittedAt: new Date().toISOString().split('T')[0],
                        note: '',
                      },
                    },
                    'Your sample application has been submitted for review.',
                  ),
                notify,
                'Submitted. Switch to the admin preview to review this application.',
              );
            }}
          >
            {connected ? 'Submit for review' : 'Submit for demo review'} <ArrowRight size={17} />
          </button>
          {(connected ? !connected.canSubmit : !canSubmit(data)) && (
            <p className="muted">Complete all three checklist items to submit.</p>
          )}
        </>
      ) : data.application.status === 'Approved' ? (
        <div className="success-note">
          <ShieldCheck />
          {connected
            ? 'Your application is approved and your business can appear in the directory.'
            : 'Your sample application is approved. Credential preview: VA-DEMO-001.'}
        </div>
      ) : (
        <div className="notice">
          {data.application.status === 'Pending review'
            ? connected
              ? 'Your application is awaiting review. We will notify you when a decision is recorded.'
              : 'Your application is awaiting review. Switch to the admin preview and open Applications to continue the demo.'
            : connected
              ? 'Your credential is suspended. Contact the review team before resubmitting.'
              : 'Your sample credential is suspended. Contact the review team through the support process before resubmitting.'}
        </div>
      )}
    </Card>
  );
}
