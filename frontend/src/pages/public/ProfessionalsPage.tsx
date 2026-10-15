import { ProfessionalCard } from '../../components/professionals/ProfessionalCard';
import { Card } from '../../components/ui/Card';

import { ArrowUpRight, ShieldCheck, MapPin, Wrench, Search } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function ProfessionalsPage({
  book,
  city,
  embedded = false,
  results,
  service,
  setCity,
  setModal,
  setService,
  setStep,
  setType,
  type,
}: any) {
  const Tag = embedded ? 'div' : 'main';
  return (
    <Tag className={'section app-page' + (embedded ? ' directory-embedded' : '')}>
      <div className="eyebrow">FIND YOUR NEXT PROFESSIONAL</div>
      <h1>
        Good hands.
        <br />
        <em>Closer to home.</em>
      </h1>
      <p className="muted">
        Illustrative professionals only. No businesses below have been verified or listed for real
        bookings.
      </p>
      <div className="filters">
        <label>
          Location
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option>All locations</option>
            <option>East London</option>
            <option>Johannesburg</option>
          </select>
        </label>
        <label>
          Service
          <select value={service} onChange={(e) => setService(e.target.value)}>
            {[
              'All services',
              'Servicing',
              'Diagnostics',
              'Brakes',
              'Batteries',
              'Auto electrical',
              'Not sure yet',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Professional
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Either</option>
            <option>Workshop</option>
            <option>Mobile mechanic</option>
          </select>
        </label>
      </div>
      <div className="results-top">
        <b>{results.length} sample professionals</b>
        <span>Illustrative assessment fees in ZAR</span>
      </div>
      <div className="provider-grid">
        {results.map((p) => (
          <ProfessionalCard
            key={p.name}
            professional={p}
            onView={() => {
              setModal(p);
              setStep(0);
            }}
            onBook={() => book(p)}
          />
        ))}
      </div>
      {!results.length && (
        <Card as="div" className="empty">
          <Search />
          <h3>No sample matches for these filters</h3>
          <p>Try another service or professional type.</p>
          <button
            className="primary"
            onClick={() => {
              setType('Either');
              setService('All services');
            }}
          >
            Clear filters
          </button>
        </Card>
      )}
    </Tag>
  );
}
