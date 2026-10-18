import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { RoadLoader } from '../../components/ui/RoadLoader';
import { initialsFromName } from '../../features/account/customerIdentity';
import { readProfilePhoto } from '../../features/account/profilePhoto';
import { formatPhone } from '../../features/account/phoneNumber';
import { saveCustomerProfile } from '../../features/demo/demoActions';

/** Customer profile. Passwords are not stored in this browser preview. */
export function SettingsPage({ data, notify, update }: any) {
  const settings = data.settings || {};
  const [name, setName] = useState(settings.name || '');
  const [email, setEmail] = useState(settings.email || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [emailUpdates, setEmailUpdates] = useState(settings.emailUpdates === true);
  const [photo, setPhoto] = useState(typeof settings.photo === 'string' ? settings.photo : '');
  const [photoState, setPhotoState] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordMismatch = nextPassword.length > 0 && confirmPassword.length > 0 && nextPassword !== confirmPassword;
  const passwordWeak = nextPassword.length > 0 && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(nextPassword);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onPhoto(file: File) {
    setPhotoState('working');
    setError('');
    try {
      setPhoto(await readProfilePhoto(file));
    } catch (reason: any) {
      setError(reason?.message || 'This image could not be read. Try a different JPG, PNG, or WebP.');
    } finally {
      setPhotoState('idle');
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const saved = update((current: any) =>
        saveCustomerProfile(current, { name, email, phone, emailUpdates, photo }),
      );
      notify(
        saved
          ? 'Demo profile saved in this browser.'
          : 'Could not save this profile in this browser. Check storage space and try again.',
      );
    } catch (reason: any) {
      setError(reason.message);
    }
  }

  return (
    <div className="customer-profile">
      <Card as="form" className="dash-panel settings-form" onSubmit={save}>
        <h2>Profile</h2>
        <p className="muted">
          Use sample details. This profile stays in this browser and does not create a real account
          or send notifications.
        </p>
        <div className="avatar-upload">
          <span className="avatar big" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : initialsFromName(name)}
          </span>
          <label className="secondary">
            {photo ? 'Replace photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void onPhoto(file);
              }}
            />
          </label>
          {photo ? (
            <button className="text-link" type="button" onClick={() => setPhoto('')}>
              Remove photo
            </button>
          ) : null}
          {photoState === 'working' ? <RoadLoader label="Preparing photo" /> : null}
        </div>
        <div className="form-row">
          <label>
            Full name
            <input autoComplete="name" value={name} required onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        </div>
        <label>
          Cell phone number
          <input
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 123 4567 or +27 82 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        {phone ? <p className="muted">Saved format preview: {formatPhone(phone) || phone}</p> : null}
        <label className="check-label">
          <input
            type="checkbox"
            checked={emailUpdates}
            onChange={(event) => setEmailUpdates(event.target.checked)}
          />
          Email updates preference
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary" type="submit" disabled={photoState === 'working'}>
          Save profile <Check size={17} />
        </button>
      </Card>
      <Card
        as="form"
        className="dash-panel settings-form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <h2>Change password</h2>
        <p className="muted">
          Unavailable until secure authentication is connected. This preview does not store or
          change a password.
        </p>
        <p id="password-rules">
          Use at least 8 characters, including a letter and a number. Confirmation must match the
          new password.
        </p>
        <label>
          Current password
          <span className="password-field">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              aria-describedby="password-rules"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <button
              type="button"
              className="text-link"
              aria-pressed={showCurrent}
              aria-label={showCurrent ? 'Hide Current password' : 'Show Current password'}
              onClick={() => setShowCurrent((value) => !value)}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <label>
          New password
          <span className="password-field">
            <input
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby="password-rules"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
            <button
              type="button"
              className="text-link"
              aria-pressed={showNext}
              aria-label={showNext ? 'Hide New password' : 'Show New password'}
              onClick={() => setShowNext((value) => !value)}
            >
              {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <label>
          Confirm new password
          <span className="password-field">
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby="password-rules"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className="text-link"
              aria-pressed={showConfirm}
              aria-label={showConfirm ? 'Hide Confirm new password' : 'Show Confirm new password'}
              onClick={() => setShowConfirm((value) => !value)}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        {passwordWeak ? (
          <p className="form-error" role="alert">
            Use at least 8 characters, including a letter and a number.
          </p>
        ) : null}
        {passwordMismatch ? (
          <p className="form-error" role="alert">
            Confirmation must match the new password.
          </p>
        ) : null}
        <button className="secondary" type="submit" disabled>
          Change password unavailable
        </button>
      </Card>
    </div>
  );
}
