import { Card } from '../../components/ui/Card';

import { ArrowRight, ShieldCheck, FileText, Upload, Trash2 } from 'lucide-react';

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
}: any) {
  return (
    <>
      <div className="workspace-note">
        <ShieldCheck size={20} />
        <span>
          Use non-sensitive sample files only. This preview saves filenames and sizes, not file
          contents. Secure uploads and document access will be added to the backend.
        </span>
      </div>
      <div className="dashboard-columns">
        <Card as="section" className="dash-panel">
          <h2>Supporting evidence</h2>
          <p className="muted">Show the experience behind your work.</p>
          <label className="field-label">
            Document category
            <select id="document-kind">
              <option>Identity evidence</option>
              <option>Qualifications / experience</option>
              <option>Business registration (where applicable)</option>
              <option>Workshop / service-area evidence</option>
            </select>
          </label>
          <label className="upload-zone">
            <Upload size={32} />
            <b>Select a sample document</b>
            <span>PDF, JPG or PNG · up to 10 MB</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={upload} />
          </label>
          {uploadError && (
            <p role="alert" className="error-text">
              {uploadError}
            </p>
          )}
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
                  <span>Metadata only · {d.date}</span>
                </div>
                <button
                  aria-label={'Remove ' + d.kind}
                  onClick={() => {
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
              text="Select sample files or use the sample evidence button."
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
