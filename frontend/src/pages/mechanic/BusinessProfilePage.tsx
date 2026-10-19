import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { demoAreas, demoAreaById } from '../../data/demoAreas';
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
}: any) {
  const [email, setEmail] = useState(initialEmail);
  return (
    <Card
      as="form"
      className="dash-panel settings-form"
      onSubmit={(e) => {
        e.preventDefault();
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
        <span className="avatar big">
          <Wrench size={30} />
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
          Service area
          <select
            value={profile.areaId || demoAreas.find((area) => area.label === profile.city || area.city === profile.city)?.id || ''}
            onChange={(e) => {
              const area = demoAreaById(e.target.value);
              setProfile({
                ...profile,
                areaId: area?.id || '',
                city: area?.label || '',
                serviceRadiusKm: profile.type === 'Mobile mechanic' ? profile.serviceRadiusKm || 25 : null,
              });
            }}
          >
            <option value="">Select a demo area</option>
            {demoAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contact number
          <input
            required
            type="tel"
            placeholder="Use a sample phone number"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </label>
      </div>
      <label>
        Email address
        <input
          name="accountEmail"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
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
      <fieldset>
        <legend>Services offered</legend>
        <div className="check-grid">
          {['Servicing', 'Diagnostics', 'Brakes', 'Batteries', 'Auto electrical'].map((s) => (
            <label className="check-label" key={s}>
              <input
                type="checkbox"
                checked={profile.services.includes(s)}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    services: e.target.checked
                      ? [...profile.services, s]
                      : profile.services.filter((v: string) => v !== s),
                  })
                }
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      {profile.type === 'Mobile mechanic' ? (
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
        {chargeConfirmation} This preview does not advertise a separate booking fee. Choosing an area stores a demo area centre, not a geocoded street address.
        {profile.type === 'Mobile mechanic' ? ' A mobile listing uses that area as a service-area reference, not a private base address.' : ''}
      </p>
      <div className="button-row">
        <button className="primary" type="submit">
          Save profile <Check size={17} />
        </button>
        <button type="button" className="text-link" onClick={() => route('profile/documents')}>
          Next: documents <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}
