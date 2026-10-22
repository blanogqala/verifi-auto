import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ProfessionalCard } from '../../components/professionals/ProfessionalCard';
import { Card } from '../../components/ui/Card';
import { demoAreas } from '../../data/demoAreas';
import {
  defaultDiscovery,
  discoveryWithArea,
  discoveryWithBrowser,
  distanceDisclosure,
  geolocationMessage,
  type DiscoverySession,
} from '../../features/professionals/discovery';
import {
  rememberDirectoryScroll,
  restoreDirectoryScroll,
  takeDirectoryScroll,
} from '../../features/professionals/discoveryState';
import { followDetail } from '../../features/navigation/returnPath';
import { RoadLoader } from '../../components/ui/RoadLoader';
import { Search } from 'lucide-react';

let automaticLocationAttempted = false;

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
  live = false,
  loading = false,
  error = '',
  children,
}: any) {
  const state: DiscoverySession = discovery || { ...defaultDiscovery, service, type };
  const requestVersion = useRef(0);
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

  function useMyLocation() {
    const version = ++requestVersion.current;
    setLocationError('');
    const geo = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    if (!geo) {
      setLocationError(geolocationMessage(null, false));
      return;
    }
    setLocating(true);
    geo.getCurrentPosition(
      (position) => {
        if (version !== requestVersion.current) return;
        setLocating(false);
        setDiscovery?.((current: DiscoverySession) =>
          discoveryWithBrowser(
            current || state,
            position.coords.latitude,
            position.coords.longitude,
          ),
        );
      },
      (error) => {
        if (version !== requestVersion.current) return;
        setLocating(false);
        setLocationError(
          geolocationMessage(typeof error?.code === 'number' ? error.code : null, true),
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    let active = true;
    // Defer past StrictMode's setup/cleanup rehearsal, avoiding duplicate prompts.
    queueMicrotask(() => {
      if (active && !state.origin && !automaticLocationAttempted) {
        automaticLocationAttempted = true;
        useMyLocation();
      }
    });
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, []);

  function openProfile(professional: any) {
    if (!professional?.id || typeof go !== 'function') return;
    rememberDirectoryScroll(bucket);
    const from = embedded ? 'dashboard/find' : 'find';
    const to =
      (embedded ? 'dashboard/find/' : 'professional/') + encodeURIComponent(professional.id);
    followDetail(go, from, to);
  }

  return (
    <Tag className={'section app-page' + (embedded ? ' directory-embedded' : '')}>
      <div className="directory-heading">
        <h1>Find a professional</h1>
        <p className="muted">The right help for your car, closer to home.</p>
      </div>
      <div className="filters directory-simple-filters">
        <label>
          Location
          <select
            ref={areaRef}
            aria-label="Search area"
            value={state.areaId}
            onChange={(event) => {
              requestVersion.current += 1;
              setLocating(false);
              setLocationError('');
              if (!event.target.value) {
                useMyLocation();
                return;
              }
              setDiscovery?.((current: DiscoverySession) =>
                discoveryWithArea(current || state, event.target.value),
              );
            }}
          >
            <option value="">
              {state.origin?.kind === 'browser'
                ? 'Current location'
                : 'Choose area / current location'}
            </option>
            {demoAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Service
          <select value={service} onChange={(event) => setService(event.target.value)}>
            {[
              'All services',
              'Servicing',
              'Diagnostics',
              'Brakes',
              'Batteries',
              'Auto electrical',
              'Not sure yet',
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Professional
          <select
            aria-label="Professional type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>Either</option>
            <option>Workshop</option>
            <option>Mobile mechanic</option>
          </select>
        </label>
      </div>
      <div className="results-top" aria-live="polite">
        <b>
          {loading ? 'Loading' : results.length} professionals
          {state.origin ? ' · nearest first' : ''}
        </b>
        <span>
          {locating
            ? 'Finding your location…'
            : state.origin
              ? `From ${state.origin.label}`
              : 'Choose an area to see distances'}
        </span>
      </div>
      {locationError ? (
        <p className="directory-note" role="status">
          {locationError}
        </p>
      ) : null}
      {loading ? <RoadLoader label="Finding verified professionals…" /> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="provider-grid">
        {results.map((professional: any) => (
          <ProfessionalCard
            key={professional.id || professional.name}
            professional={professional}
            onView={() => openProfile(professional)}
            onBook={book ? () => book(professional) : undefined}
          />
        ))}
      </div>
      {!loading && !error && !results.length ? (
        <Card as="div" className="empty">
          <Search aria-hidden="true" />
          <h3>No professionals offer this service yet</h3>
          <p>Choose another service above.</p>
        </Card>
      ) : null}
      <p className="directory-note directory-disclosure">
        {live ? 'Approved professionals. ' : 'Sample professionals for this demo. '}
        {live
          ? (disclosure || 'Distances appear when a location is available.').replace(
              'demo area centre',
              'area centre',
            )
          : disclosure || 'Distances appear when a location is available.'}
      </p>
      {children}
    </Tag>
  );
}
