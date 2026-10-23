import { Card } from '../../components/ui/Card';

import { ArrowRight, ShieldCheck, FileText, Upload, Trash2, Eye } from 'lucide-react';

import { EmptyState as Empty } from '../../components/ui/EmptyState';
import { commitUpdate } from '../../features/demo/commitUpdate';

/** Presentational view. State and actions are supplied by the owning layout. */
export function DocumentsPage({
  data,
  filter,
  name,
  notify,
  role,
  route,
  update,
  upload,
  uploadError,
  connected,
}: any) {
  return (
    <>
      <div className="workspace-note">
        <ShieldCheck size={20} />
        <span>
          {connected
            ? 'Your documents are stored privately for application review. PDF, JPG or PNG · up to 5 MB.'
            : 'Use non-sensitive sample files only. This preview saves filenames and sizes, not file contents.'}
        </span>
      </div>
      <div className="dashboard-columns">
        <Card as="section" className="dash-panel">
          <h2>Supporting evidence</h2>
          <p className="muted">Show the experience behind your work.</p>
          <label className="field-label">
            Document category
            <select id="document-kind">
              {connected ? (
                <>
                  <option value="IDENTITY">Identity evidence</option>
                  <option value="QUALIFICATION">Qualifications / experience</option>
                  <option value="BUSINESS">Business registration</option>
                </>
              ) : (
                <>
                  <option>Identity evidence</option>
                  <option>Qualifications / experience</option>
                  <option>Business registration (where applicable)</option>
                  <option>Workshop / service-area evidence</option>
                </>
              )}
            </select>
          </label>
          <label className="upload-zone">
            <Upload size={32} />
            <b>{connected ? 'Select a document' : 'Select a sample document'}</b>
            <span>PDF, JPG or PNG · up to {connected ? 5 : 10} MB</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={upload} />
          </label>
          {uploadError && (
            <p role="alert" className="error-text">
              {uploadError}
            </p>
          )}
          {!connected ? (
            <button
              className="secondary"
              onClick={() => {
                commitUpdate(
                  update,
                  (d: any) => ({
                    ...d,
                    documents: [
                      {
                        id: 'sample-id',
                        kind: 'Identity evidence',
                        name: 'sample-identity.pdf',
                        size: 24500,
                        date: '2026-10-14',
                      },
                      {
                        id: 'sample-qualification',
                        kind: 'Qualifications / experience',
                        name: 'sample-qualification.pdf',
                        size: 32000,
                        date: '2026-10-14',
                      },
                    ],
                    application: { ...d.application, status: 'Draft' },
                  }),
                  notify,
                  'Illustrative evidence added. No real documents uploaded.',
                );
              }}
            >
              Use sample evidence instead
            </button>
          ) : null}
        </Card>
        <Card as="section" className="dash-panel">
          <h2>Selected documents</h2>
          {data.documents.length ? (
            data.documents.map((d: any) => (
              <div className="document-row" key={d.id}>
                <FileText size={22} />
                <div>
                  <b>{d.kind}</b>
                  <small>
                    {d.name} · {Math.ceil(d.size / 1024)} KB
                  </small>
                  <span>
                    {connected ? 'Private document' : 'Metadata only'} · {d.date}
                  </span>
                  {connected && <small>
                    Review: {d.reviewStatus === 'APPROVED' ? 'Approved' : d.reviewStatus === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Not reviewed yet'}
                    {d.reviewNote ? ` · ${d.reviewNote}` : ''}
                  </small>}
                </div>
                {connected && (
                  <a className="icon-action" aria-label={'View ' + d.kind} title={'View ' + d.kind}
                    href={connected.previewUrl(d.id)} target="_blank" rel="noopener noreferrer">
                    <Eye size={18} />
                  </a>
                )}
                <button
                  title={connected && !['Draft', 'Changes requested'].includes(data.application?.status) ? 'Documents cannot be deleted during review' : 'Delete ' + d.kind}
                  disabled={Boolean(connected) && !['Draft', 'Changes requested'].includes(data.application?.status)}
                  aria-label={'Remove ' + d.kind}
                  onClick={() => {
                    if (connected) {
                      void connected.remove(d.id);
                      return;
                    }
                    commitUpdate(
                      update,
                      (s: any) => ({
                        ...s,
                        documents: s.documents.filter((x: any) => x.id !== d.id),
                        application: { ...s.application, status: 'Draft' },
                      }),
                      notify,
                      'Sample document removed; application returned to draft.',
                    );
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          ) : (
            <Empty
              title="Your evidence goes here."
              text={
                connected
                  ? 'Select a document to support your application.'
                  : 'Select sample files or use the sample evidence button.'
              }
            />
          )}
          <button className="text-link" onClick={() => route('profile/verification')}>
            View application checklist <ArrowRight size={17} />
          </button>
        </Card>
      </div>
    </>
  );
}
