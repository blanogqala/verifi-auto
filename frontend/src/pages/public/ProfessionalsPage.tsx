import { useLayoutEffect, useRef, useState } from 'react';
import { ProfessionalCard } from '../../components/professionals/ProfessionalCard';
import { Card } from '../../components/ui/Card';
import { demoAreaNote, demoAreas } from '../../data/demoAreas';
import {
  defaultDiscovery,
  directorySummary,
  discoveryWithArea,
  discoveryWithBrowser,
  distanceDisclosure,
  geolocationMessage,
  nextRadius,
  searchRadii,
  type DiscoverySession,
} from '../../features/professionals/discovery';
import { rememberDirectoryScroll, restoreDirectoryScroll, takeDirectoryScroll } from '../../features/professionals/discoveryState';
import { followDetail } from '../../features/navigation/returnPath';
import { MapPin, Search } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function ProfessionalsPage({
  book,
  discovery,
  embedded = false,
  go,
  results,
  setDiscovery,
  service,
  setService,
  setType,
  type,
}: any) {
  const state: DiscoverySession = discovery || { ...defaultDiscovery, service, type };
  const areaRef = useRef<HTMLSelectElement>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const bucket = embedded ? 'dashboard' : 'public';
  const Tag = embedded ? 'div' : 'main';
  const disclosure = distanceDisclosure(state.origin);

  useLayoutEffect(() => {
    const y = takeDirectoryScroll(bucket);
    if (y == null) return;
    restoreDirectoryScroll(bucket, y);
  }, [bucket]);

  function update(patch: Partial<DiscoverySession>) {
    setDiscovery?.((current: DiscoverySession) => ({ ...(current || state), ...patch }));
  }

  function useMyLocation() {
    setLocationError('');
    const geo = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    if (!geo) {
      setLocationError(geolocationMessage(null, false));
      return;
    }
    setLocating(true);
    geo.getCurrentPosition(
      (position) => {
        setLocating(false);
        setDiscovery?.((current: DiscoverySession) =>
          discoveryWithBrowser(current || state, position.coords.latitude, position.coords.longitude),
        );
      },
      (error) => {
        setLocating(false);
        setLocationError(geolocationMessage(typeof error?.code === 'number' ? error.code : null, true));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function openProfile(professional: any) {
    if (!professional?.id || typeof go !== 'function') return;
    rememberDirectoryScroll(bucket);
    const from = embedded ? 'dashboard/find' : 'find';
    const to = (embedded ? 'dashboard/find/' : 'professional/') + encodeURIComponent(professional.id);
    followDetail(go, from, to);
  }

  const wider = nextRadius(state.radiusKm);
  const asking = state.mode === 'nearby' && !state.origin;

  return (
    <Tag className={'section app-page' + (embedded ? ' directory-embedded' : '')}>
      <div className="eyebrow">FIND YOUR NEXT PROFESSIONAL</div>
      <h1>
        Good hands.
        <br />
        <em>Closer to home.</em>
      </h1>
      <p className="muted">
        Illustrative professionals only. No businesses below have been verified or listed for real bookings.
        Distances are approximate straight-line measurements, not driving distance.
      </p>
      <div className="filters directory-filters">
        <div className="location-selected">
          {state.origin ? (
            <p>
              <MapPin size={15} aria-hidden="true" /> Selected location: <strong>{state.origin.label}</strong>
              {state.origin.kind === 'area-centre' ? ' · demo area centre' : ' · shared for this session'}
              <button className="text-link" type="button" onClick={() => areaRef.current?.focus()}>
                Change
              </button>
            </p>
          ) : (
            <p>No location selected. Nearby results stay hidden until you choose one.</p>
          )}
        </div>
        <div className="directory-controls">
          <button className="secondary" type="button" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Finding location…' : 'Use my location'}
          </button>
          <label>
            Area
            <select
              ref={areaRef}
              aria-label="Choose an area"
              value={state.areaId}
              onChange={(event) => setDiscovery?.((current: DiscoverySession) => discoveryWithArea(current || state, event.target.value))}
            >
              <option value="">Choose an area</option>
              {demoAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Radius
            <select
              aria-label="Search radius"
              value={state.radiusKm}
              onChange={(event) => update({ radiusKm: Number(event.target.value) as DiscoverySession['radiusKm'], mode: 'nearby' })}
            >
              {searchRadii.map((radius) => (
                <option key={radius} value={radius}>
                  {radius} km
                </option>
              ))}
            </select>
          </label>
          <label>
            Service
            <select value={service} onChange={(event) => setService(event.target.value)}>
              {['All services', 'Servicing', 'Diagnostics', 'Brakes', 'Batteries', 'Auto electrical', 'Not sure yet'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Professional
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option>Either</option>
              <option>Workshop</option>
              <option>Mobile mechanic</option>
            </select>
          </label>
          <button className="text-link" type="button" onClick={() => update({ mode: state.mode === 'all' ? 'nearby' : 'all' })}>
            {state.mode === 'all' ? 'Return to nearby search' : 'Browse all areas'}
          </button>
        </div>
        <p className="directory-note">{demoAreaNote}</p>
        {locationError ? (
          <p className="form-error" role="alert">
            {locationError}
          </p>
        ) : null}
        {disclosure ? <p className="directory-note">{disclosure}</p> : null}
      </div>
      <div className="results-top">
        <b>{directorySummary(state, results.length)}</b>
        <span>{state.mode === 'all' ? 'All demo areas, not a nearby search' : 'Sample profiles for this preview'}</span>
      </div>
      <div className="provider-grid">
        {results.map((professional: any) => (
          <ProfessionalCard
            key={professional.id || professional.name}
            professional={professional}
            onView={() => openProfile(professional)}
            onBook={() => book(professional)}
          />
        ))}
      </div>
      {!results.length && (
        <Card as="div" className="empty">
          <Search />
          <h3>{asking ? 'Choose a location' : 'No sample matches'}</h3>
          <p>
            {asking
              ? 'Nearby results stay empty until you share a location or choose a demo area. This list is not expanded nationwide.'
              : state.mode === 'nearby' && state.origin
                ? `No sample professionals within ${state.radiusKm} km of ${state.origin.label}. Results were not expanded nationwide.`
                : 'Try another service or professional type.'}
          </p>
          <div className="button-row">
            {state.mode === 'nearby' && wider ? (
              <button className="primary" type="button" onClick={() => update({ radiusKm: wider })}>
                Increase radius to {wider} km
              </button>
            ) : null}
            <button className="secondary" type="button" onClick={() => areaRef.current?.focus()}>
              Change location
            </button>
            {state.mode !== 'all' ? (
              <button className="secondary" type="button" onClick={() => update({ mode: 'all' })}>
                Browse all areas
              </button>
            ) : (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setType('Either');
                  setService('All services');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>
      )}
    </Tag>
  );
}
