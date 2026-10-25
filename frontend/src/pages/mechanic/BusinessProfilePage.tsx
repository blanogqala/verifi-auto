import { useEffect, useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { demoAreas } from '../../data/demoAreas';
import { TagPicker } from '../../components/ui/TagPicker';
import { chargeConfirmation } from '../../features/jobs/pricingModel';

import { ArrowRight, Wrench, Check } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function BusinessProfilePage({
  filter,
  initialEmail = '',
  name,
  notify,
  profile,
  route,
  setProfile,
  update,
  connected,
}: any) {
  const [email, setEmail] = useState(initialEmail);
  const emailEdited = useRef(false);
  const [saving, setSaving] = useState(false);
  const areas = Array.isArray(profile.serviceAreas)
    ? profile.serviceAreas : profile.city ? [profile.city] : [];
  const services = Array.isArray(profile.services) ? profile.services : [];
  const areaSuggestions = [...new Set([
    'Cape Town', 'Johannesburg', 'East London', 'Pretoria', 'Durban',
    ...demoAreas.map((area) => area.city),
    ...demoAreas.map((area) => area.label),
  ])];
  useEffect(() => {
    if (!emailEdited.current) setEmail(initialEmail);
  }, [initialEmail]);
  return (
    <Card
      as="form"
      className="dash-panel settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (connected) {
          if (saving) return;
          setSaving(true);
          try {
            await connected.save(profile);
          } finally {
            setSaving(false);
          }
          return;
        }
        commitUpdate(
          update,
          (d: any) => ({
            ...d,
            profile,
            mechanicAccount: {
              ...(d.mechanicAccount || d.merchantAccount || {}),
              email: email.trim(),
            },
            application: { ...d.application, status: 'Draft' },
          }),
          notify,
          'Business profile saved. Changes require application review.',
        );
      }}
    >
      <div className="panel-title">
        <div>
          <h2>A profile that tells your story.</h2>
          <p>Help customers understand your expertise and where you work.</p>
        </div>
        <span className="avatar big mechanic-photo-avatar">
          {profile?.photo ? (
            <img src={profile.photo} alt="" />
          ) : (
            <Wrench size={30} aria-hidden="true" />
          )}
        </span>
      </div>
      <div className="form-row">
        <label>
          Business or trading name
          <input
            required
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </label>
        <label>
          Professional type
          <select
            value={profile.type}
            onChange={(e) => setProfile({ ...profile, type: e.target.value })}
          >
            <option>Workshop</option>
            <option>Mobile mechanic</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Email address
          <input
            readOnly={!!connected}
            name="accountEmail"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => {
              emailEdited.current = true;
              setEmail(e.target.value);
            }}
          />
        </label>
        <label>
          Contact number
          <input
            required
            type="tel"
            placeholder={connected ? 'Contact number' : 'Use a sample phone number'}
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </label>
      </div>
      <label>
        About your expertise
        <textarea
          required
          maxLength={1500}
          placeholder="Tell customers about your experience, vehicle specialities, and approach to repairs."
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label>
          Business address
          <input
            value={profile.address || ''}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </label>
        <label>
          Website
          <input
            type="url"
            value={profile.website || ''}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row profile-offerings-row">
        <TagPicker
          label="Service Areas"
          values={areas}
          suggestions={areaSuggestions}
          onChange={(next) => setProfile({
            ...profile,
            serviceAreas: next,
            city: next.includes(profile.city) ? profile.city : next[0] || '',
          })}
        />
        <TagPicker
          label="Services Offered"
          values={services}
          suggestions={['Servicing', 'Diagnostics', 'Brakes', 'Batteries', 'Auto electrical', 'Engine repairs', 'Tyres', 'Air conditioning', 'Suspension', 'Bodywork']}
          maxItems={30}
          onChange={(next) => setProfile({ ...profile, services: next })}
        />
      </div>
      {!connected && profile.type === 'Mobile mechanic' ? (
        <label>
          Service radius
          <select
            value={profile.serviceRadiusKm || 25}
            onChange={(e) => setProfile({ ...profile, serviceRadiusKm: Number(e.target.value) })}
          >
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
          </select>
        </label>
      ) : null}
      <p className="muted">
        {chargeConfirmation}{' '}
        {connected
          ? 'Changes to business details require a fresh review before the directory listing is shown again.'
          : 'Coverage selections are labels, not geocoded street addresses.'}
      </p>
      <div className="button-row">
        <button className="primary" type="submit" disabled={saving}>
          Save profile <Check size={17} />
        </button>
        <button type="button" className="text-link" onClick={() => route('profile/documents')}>
          Next: documents <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}
