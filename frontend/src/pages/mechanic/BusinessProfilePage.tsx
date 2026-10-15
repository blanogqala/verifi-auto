import { useState } from 'react';
import { Card } from '../../components/ui/Card';

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
        update((d: any) => ({
          ...d,
          profile,
          mechanicAccount: {
            ...(d.mechanicAccount || d.merchantAccount || {}),
            email: email.trim(),
          },
          application: { ...d.application, status: 'Draft' },
        }));
        notify('Business profile saved. Changes require application review.');
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
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          >
            <option>East London</option>
            <option>Johannesburg</option>
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
      <label>
        Assessment fee (ZAR)
        <input
          required
          type="number"
          min="0"
          max="100000"
          value={profile.fee}
          onChange={(e) => setProfile({ ...profile, fee: Number(e.target.value) })}
        />
      </label>
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
