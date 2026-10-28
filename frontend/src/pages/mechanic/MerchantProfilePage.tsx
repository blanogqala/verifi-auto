import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Camera, Check, FileText, Landmark, ShieldCheck, Wrench, Star, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge as Status } from '../../components/ui/StatusBadge';
import { merchantProfileSectionLabel, type MerchantProfileSection } from '../../config/navigation';
import { bankingRecord } from '../../features/account/bankingDetails';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { initialsFromName, merchantIdentityLabel } from '../../features/account/customerIdentity';
import { photoFileError, readProfilePhoto } from '../../features/account/profilePhoto';
import { BusinessProfilePage } from './BusinessProfilePage';
import { DocumentsPage } from './DocumentsPage';
import { VerificationPage } from './VerificationPage';

const tabs: { id: MerchantProfileSection; label: string; Icon: typeof Wrench }[] = [
  { id: 'business', label: merchantProfileSectionLabel.business, Icon: Wrench },
  { id: 'documents', label: merchantProfileSectionLabel.documents, Icon: FileText },
  { id: 'banking', label: merchantProfileSectionLabel.banking, Icon: Landmark },
  { id: 'verification', label: merchantProfileSectionLabel.verification, Icon: ShieldCheck },
];

const emptyBank = {
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: 'Cheque',
  branchCode: '',
};

/** Mechanic profile. Drafts stay mounted so switching tabs does not discard them. */
export function MerchantProfilePage({
  data,
  filter,
  name,
  note,
  notify,
  profile,
  role,
  route,
  section,
  setProfile,
  update,
  upload,
  uploadError,
  connected,
}: any) {
  const accountSource = data.mechanicAccount || data.merchantAccount || {};
  const savedBank = data.mechanicBanking || {};
  const [bank, setBank] = useState(() => ({
    ...emptyBank,
    accountType: savedBank.accountType || 'Cheque',
  }));
  const [bankError, setBankError] = useState('');
  const [editingBank, setEditingBank] = useState(!savedBank.configured);
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const saved = data.profile || {};
  const businessComplete = !!(saved.phone && saved.bio && saved.name && saved.services?.length);
  const documentsComplete = !!(
    data.documents?.some((item: any) => item.kind === 'Identity evidence') &&
    data.documents?.some((item: any) => item.kind === 'Qualifications / experience')
  );
  const displayName = merchantIdentityLabel(profile?.name);
  const initials = initialsFromName(profile?.name);
  const accountPhoto = profile?.photo ?? data.settings?.photo ?? '';
  const verification = data.application?.status || 'Draft';
  const [showReviews, setShowReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState('newest');
  const [starFilter, setStarFilter] = useState(0);
  const professionalId = data.mechanicAccount?.professionalId || data.profile?.id || '';
  const reviews = (data.customerReviews || []).filter((r: any) =>
    r.professionalId === professionalId && Number.isInteger(Number(r.rating)) &&
    Number(r.rating) >= 1 && Number(r.rating) <= 5
  );
  const aggregate = data.mechanicReviewSummary;
  const overallCount = Number.isInteger(aggregate?.count) ? aggregate.count : reviews.length;
  const averageRating = aggregate && aggregate.average != null
    ? Number(aggregate.average).toFixed(1)
    : reviews.length
      ? (reviews.reduce((total: number, r: any) => total + Number(r.rating), 0) / reviews.length).toFixed(1)
      : null;
  const visibleReviews = [...reviews]
    .filter((r: any) => !starFilter || Number(r.rating) === starFilter)
    .sort((a: any, b: any) => reviewSort === 'highest' ? b.rating - a.rating :
      reviewSort === 'lowest' ? a.rating - b.rating :
      reviewSort === 'oldest' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) :
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  useEffect(() => {
    if (!showReviews) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setShowReviews(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showReviews]);

  function select(next: MerchantProfileSection) {
    if (next !== section) route('profile/' + next);
  }

  function onTabsKey(event: KeyboardEvent<HTMLDivElement>) {
    const ids = tabs.map((tab) => tab.id);
    const index = Math.max(0, ids.indexOf(section));
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;
    else return;
    event.preventDefault();
    const next = ids[nextIndex];
    select(next);
    document.getElementById('profile-tab-' + next)?.focus();
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = photoFileError(file);
    if (invalid) {
      setPhotoError(invalid);
      return;
    }
    try {
      const photo = await readProfilePhoto(file);
      if (connected) await connected.savePhoto(photo);
      else setProfile({ ...profile, photo });
      setPhotoError('');
    } catch (reason: any) {
      setPhotoError(
        reason?.message || 'This image could not be read. Try a different JPG, PNG, or WebP.',
      );
    }
  }

  return (
    <div className="merchant-profile mechanic-profile">
      <Card as="section" className="dash-panel merchant-summary mechanic-summary">
        <div className="avatar-upload">
          <button
            type="button"
            className="avatar big avatar-picker mechanic-photo-avatar"
            aria-label={accountPhoto ? 'Replace profile photo' : 'Add profile photo'}
            onClick={() => photoInput.current?.click()}
          >
            {accountPhoto ? <img src={accountPhoto} alt="" /> : initials}
            <span className="avatar-edit" aria-hidden="true">
              <Camera size={14} />
            </span>
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            hidden
            onChange={onPhoto}
          />
          {accountPhoto ? (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                if (connected) void connected.savePhoto('');
                else setProfile({ ...profile, photo: '' });
                setPhotoError('');
              }}
            >
              Remove photo
            </button>
          ) : null}
          {photoError ? (
            <p className="form-error" role="alert">
              {photoError}
            </p>
          ) : null}
        </div>
        <div className="mechanic-review-summary" style={{ display: 'grid', gap: 8, alignContent: 'center', justifyItems: 'start' }}>
          <strong aria-label={averageRating ? `Average customer rating ${averageRating} out of 5` : 'No customer reviews yet'}>
            <Star size={18} style={{ display: 'inline', verticalAlign: 'middle', color: '#9658e8' }} />
            {' '}{averageRating ? `${averageRating}/5 · ${overallCount} review${overallCount === 1 ? '' : 's'}` : 'No reviews yet'}
          </strong>
          <button type="button" className="secondary" onClick={() => setShowReviews(true)}>
            View all reviews
          </button>
        </div>
        <div className="merchant-summary-copy">
          <h2>Mechanic profile</h2>
          <p className="mechanic-trade">{displayName}</p>
          <p>{profile?.type || 'Professional'}</p>
          <Status value={verification} />
          <p className="muted">
            {connected
              ? 'Your profile photo helps customers recognise you and your business.'
              : 'The photo stays in this browser after you save the business profile. It is resized for this preview and is not uploaded to a server.'}
          </p>
        </div>
      </Card>
      {showReviews && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReviews(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Customer reviews and ratings"
            className="dash-panel" style={{ width: 'min(92vw, 760px)', maxHeight: '88vh', overflowY: 'auto', padding: 24, margin: 'auto', borderRadius: 20, background: 'var(--surface, #faf7ff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div><h2>Customer reviews &amp; ratings</h2><p>{displayName}</p></div>
              <button type="button" className="icon-action" aria-label="Close customer reviews" onClick={() => setShowReviews(false)}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9658e8' }}>
              {averageRating ? `★ ${averageRating} / 5` : 'No reviews yet'}
            </p>
            <p>{overallCount} customer review{overallCount === 1 ? '' : 's'}</p>
            {[5,4,3,2,1].map((stars) => {
              const count = reviews.filter((r: any) => Number(r.rating) === stars).length;
              return <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
                <span style={{ minWidth: 52 }}>{stars} ★</span>
                <progress aria-label={`${stars} stars`} value={count} max={Math.max(1,reviews.length)} style={{ flex: 1 }} />
                <span>{count}</span>
              </div>;
            })}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '18px 0' }}>
              <label>Sort <select value={reviewSort} onChange={(event) => setReviewSort(event.target.value)}>
                <option value="newest">Newest</option><option value="oldest">Oldest</option>
                <option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
              </select></label>
              <label>Rating <select value={starFilter} onChange={(event) => setStarFilter(Number(event.target.value))}>
                <option value={0}>All stars</option>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}
              </select></label>
            </div>
            {overallCount > reviews.length && <p className="muted">Showing the latest {reviews.length} of {overallCount} reviews.</p>}
            {visibleReviews.length ? visibleReviews.map((review: any) => {
              const job = (data.jobs || []).find((j: any) => j.id === review.bookingId);
              const customer = (data.customers || []).find((u: any) => u.id === review.customerId);
              return <article key={review.id} className="admin-review" style={{ padding: '15px 0', borderTop: '1px solid #9658e844' }}>
                <strong>{review.customerName || customer?.name || job?.customerName || 'Customer name unavailable'}</strong>
                <p aria-label={`${review.rating} out of 5 stars`} style={{ color: '#9658e8', fontWeight: 700 }}>
                  {'★'.repeat(Number(review.rating))}{'☆'.repeat(5 - Number(review.rating))} · {review.rating}/5
                </p>
                <p>{review.text || review.body || 'No written review'}</p>
                {job?.vehicle && <small>{job.vehicle} · </small>}
                {review.createdAt && <small>{new Date(review.createdAt).toLocaleDateString('en-ZA')}</small>}
              </article>;
            }) : <p className="muted">No reviews match this filter.</p>}
          </section>
        </div>
      )}
      <div
        className="profile-tablist folder-tabs"
        role="tablist"
        aria-label="Profile sections"
        onKeyDown={onTabsKey}
      >
        {tabs.map((tab) => {
          const selected = section === tab.id;
          const complete =
            tab.id === 'business'
              ? businessComplete
              : tab.id === 'documents'
                ? documentsComplete
                : false;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              id={'profile-tab-' + tab.id}
              type="button"
              role="tab"
              className={selected ? 'selected' : ''}
              aria-selected={selected}
              aria-controls={'profile-panel-' + tab.id}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
              {complete ? <Check size={14} aria-hidden="true" /> : null}
              {complete ? <span className="visually-hidden">, checklist complete</span> : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="profile-panel-business"
        className="profile-tab-panel"
        aria-labelledby="profile-tab-business"
        hidden={section !== 'business'}
      >
        <BusinessProfilePage
          connected={connected}
          filter={filter}
          initialEmail={typeof accountSource.email === 'string' ? accountSource.email : ''}
          name={name}
          notify={notify}
          profile={profile}
          route={route}
          setProfile={setProfile}
          update={update}
        />
      </div>
      <div
        role="tabpanel"
        id="profile-panel-documents"
        className="profile-tab-panel"
        aria-labelledby="profile-tab-documents"
        hidden={section !== 'documents'}
      >
        <DocumentsPage
          connected={connected}
          data={data}
          filter={filter}
          name={name}
          notify={notify}
          role={role}
          route={route}
          update={update}
          upload={upload}
          uploadError={uploadError}
        />
      </div>
      <div
        role="tabpanel"
        id="profile-panel-banking"
        className="profile-tab-panel"
        aria-labelledby="profile-tab-banking"
        hidden={section !== 'banking'}
      >
        {connected ? (
          <Card as="section" className="dash-panel settings-form">
            <h2>Banking details</h2>
            <p className="muted">
              Payout onboarding is not connected yet. Bank details cannot be saved, and no payout
              account is created.
            </p>
            <div className="notice" role="status">
              Online payouts are unavailable until a payment provider is connected.
            </div>
          </Card>
        ) : (
          <Card as="section" className="dash-panel settings-form">
            <h2>Banking details</h2>
            <p className="muted">
              Use sample details only. Saving this form does not verify an account, set up payouts,
              or send money. This preview stores a masked account number and a demo setup status in
              this browser. It does not keep the full account number.
            </p>
            {savedBank.configured && !editingBank ? (
              <>
                <dl className="banking-summary">
                  <div>
                    <dt>Bank name</dt>
                    <dd>{savedBank.bankName}</dd>
                  </div>
                  <div>
                    <dt>Account holder</dt>
                    <dd>{savedBank.accountHolder}</dd>
                  </div>
                  <div>
                    <dt>Account number</dt>
                    <dd>{savedBank.maskedAccount}</dd>
                  </div>
                  <div>
                    <dt>Account type</dt>
                    <dd>{savedBank.accountType}</dd>
                  </div>
                  <div>
                    <dt>Branch code</dt>
                    <dd>{savedBank.branchCode}</dd>
                  </div>
                </dl>
                <p className="notice">Demo setup saved. No bank account has been verified.</p>
                <button className="secondary" type="button" onClick={() => setEditingBank(true)}>
                  Edit banking details
                </button>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = bankingRecord(bank);
                  if (result.error || !result.record) {
                    setBankError(result.error || 'Check the sample banking details.');
                    return;
                  }
                  const saved = commitUpdate(
                    update,
                    (current: any) => ({ ...current, mechanicBanking: result.record }),
                    notify,
                    'Sample banking details saved in this browser. No payout was set up.',
                  );
                  if (!saved) return;
                  setBankError('');
                  setBank({ ...emptyBank, accountType: result.record.accountType });
                  setEditingBank(false);
                }}
              >
                <div className="form-row">
                  <label>
                    Bank name
                    <input
                      name="bankName"
                      required
                      value={bank.bankName}
                      autoComplete="off"
                      onChange={(event) => setBank({ ...bank, bankName: event.target.value })}
                    />
                  </label>
                  <label>
                    Account holder
                    <input
                      name="accountHolder"
                      required
                      value={bank.accountHolder}
                      autoComplete="off"
                      onChange={(event) => setBank({ ...bank, accountHolder: event.target.value })}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Account number
                    <input
                      name="accountNumber"
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      value={bank.accountNumber}
                      onChange={(event) => setBank({ ...bank, accountNumber: event.target.value })}
                    />
                  </label>
                  <label>
                    Account type
                    <select
                      name="accountType"
                      value={bank.accountType}
                      onChange={(event) => setBank({ ...bank, accountType: event.target.value })}
                    >
                      <option>Cheque</option>
                      <option>Savings</option>
                      <option>Transmission</option>
                    </select>
                  </label>
                </div>
                <label>
                  Branch code
                  <input
                    name="branchCode"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    value={bank.branchCode}
                    onChange={(event) => setBank({ ...bank, branchCode: event.target.value })}
                  />
                </label>
                {bankError ? (
                  <p className="form-error" role="alert">
                    {bankError}
                  </p>
                ) : null}
                <div className="button-row">
                  <button className="primary" type="submit">
                    Save sample banking details <Check size={17} />
                  </button>
                  {savedBank.configured ? (
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setEditingBank(false)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
      <div
        role="tabpanel"
        id="profile-panel-verification"
        className="profile-tab-panel"
        aria-labelledby="profile-tab-verification"
        hidden={section !== 'verification'}
      >
        <VerificationPage
          connected={connected}
          data={data}
          name={name}
          note={note}
          notify={notify}
          profile={profile}
          route={route}
          update={update}
        />
      </div>
    </div>
  );
}
