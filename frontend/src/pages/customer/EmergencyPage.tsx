import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CarFront, CheckCircle2, Clock3, MapPin, Navigation, PhoneCall, ShieldCheck, Wrench } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { api } from '../../data-access/api';
import { coordinatesOf, haversineKm } from '../../features/professionals/geo';

const issues = [
  'Vehicle will not start',
  'Flat or damaged tyre',
  'Battery failure',
  'Engine overheating',
  'Vehicle stopped while driving',
  'Other breakdown',
];

export function EmergencyPage({ data, professionals, live, go, notify, refresh, update }: any) {
  const [issue, setIssue] = useState(issues[0]);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: new Date().getFullYear(), registration: '' });
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [liveResult, setLiveResult] = useState<any>(null);
  const [matchingLoading, setMatchingLoading] = useState(live);
  const [matchingError, setMatchingError] = useState('');

  // This dedicated API scans opted-in approved professionals, not the first
  // 100 rows of the general directory. Search automatically expands 50/100/200 km.
  useEffect(() => {
    if (!live) return;
    let active = true;
    setMatchingLoading(true);
    setMatchingError('');
    const params = coordinates
      ? '?latitude=' + encodeURIComponent(coordinates.latitude) +
        '&longitude=' + encodeURIComponent(coordinates.longitude)
      : '';
    api('/professionals/roadside' + params)
      .then((result) => {
        if (!active) return;
        setLiveResult(result);
        setMatchingLoading(false);
      })
      .catch((reason: any) => {
        if (!active) return;
        setLiveResult(null);
        setMatchingLoading(false);
        setMatchingError(reason?.message || 'Could not load roadside professionals. Please try again.');
      });
    return () => { active = false; };
  }, [live, coordinates?.latitude, coordinates?.longitude]);

  const demoMatches = useMemo(() => {
    if (live) return { professionals: [] as any[], radiusKm: null as number | null, fallbackUnlocated: false };
    const ranked = (professionals || [])
      .filter((pro: any) =>
        pro.roadsideAvailable === true || (pro.services || []).includes('Roadside assistance'))
      .map((pro: any) => {
        const point = coordinatesOf(pro.location?.latitude ?? pro.latitude, pro.location?.longitude ?? pro.longitude);
        const km = coordinates && point ? haversineKm(coordinates, point) : null;
        return { ...pro, km };
      })
      .sort((a: any, b: any) => (a.km ?? Infinity) - (b.km ?? Infinity));
    if (!coordinates) return { professionals: ranked.slice(0, 12), radiusKm: null, fallbackUnlocated: false };
    for (const radiusKm of [50, 100, 200]) {
      const nearby = ranked.filter((pro: any) => pro.km != null && pro.km <= radiusKm);
      if (nearby.length) return { professionals: nearby.slice(0, 12), radiusKm, fallbackUnlocated: false };
    }
    const unlocated = ranked.filter((pro: any) => pro.km == null);
    return { professionals: unlocated.slice(0, 12), radiusKm: 200, fallbackUnlocated: unlocated.length > 0 };
  }, [professionals, coordinates, live]);

  const roadsideResult = live ? liveResult : demoMatches;
  const matched = ((roadsideResult?.professionals || []) as any[]).map((pro: any) => ({
    ...pro,
    km: pro.km ?? pro.distanceKm ?? null,
  }));
  const matchingRadius = roadsideResult?.radiusKm ?? null;
  const fallbackUnlocated = Boolean(roadsideResult?.fallbackUnlocated);
  const selected = matched.find((pro: any) => pro.id === selectedId);
  const vehicles = (data.vehicles || []).filter((v: any) => !v.archived && !v.archivedAt);

  function locate() {
    if (!navigator.geolocation) {
      setLocationNote('Location is not available on this device. Enter your roadside address manually.');
      return;
    }
    setLocating(true);
    setLocationNote('');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setCoordinates({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        setLocationNote('Location shared. Distances are approximate straight-line distances, not driving times.');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationNote('Location not shared. You can still enter the exact road and landmark manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !selected) return;
    if (address.trim().length < 5) {
      setError('Add a road name, location or clear landmark for the mechanic.');
      return;
    }
    if (description.trim().length < 3) {
      setError('Describe what has happened, so the mechanic knows what to bring.');
      return;
    }
    if (!vehicleId && (!newVehicle.make.trim() || !newVehicle.model.trim() || !newVehicle.registration.trim())) {
      setError('Select your car or add its make, model and registration.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let carId = vehicleId;
      let createdCar: any = null;
      if (!carId) {
        if (live) {
          createdCar = await api('/vehicles', 'POST', {
            make: newVehicle.make.trim(), model: newVehicle.model.trim(),
            year: Number(newVehicle.year), registration: newVehicle.registration.trim(),
          });
        } else {
          createdCar = { ...newVehicle, id: crypto.randomUUID(), customerId: data.settings?.id || 'cust-01' };
        }
        carId = createdCar.id;
        setVehicleId(carId); // An unsuccessful booking retry must reuse the saved vehicle.
      }
      const body = {
        kind: 'EMERGENCY', emergencyType: issue,
        vehicleId: carId, professionalId: selected.id,
        roadsideAddress: address.trim(),
        roadsideLatitude: coordinates?.latitude ?? null,
        roadsideLongitude: coordinates?.longitude ?? null,
        description: description.trim(),
        clientRequestId: requestId,
      };
      let booking: any;
      if (live) {
        booking = await api('/bookings', 'POST', body);
        refresh?.();
      } else {
        const now = new Date();
        booking = {
          id: crypto.randomUUID(), ...body, status: 'Requested', accepted: false,
          customerId: data.settings?.id || 'cust-01',
          provider: selected.name, professionalId: selected.id,
          vehicle: createdCar ? newVehicle.make + ' ' + newVehicle.model : (vehicles.find((v: any) => v.id === carId)?.make || 'Vehicle'),
          date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5),
          createdAt: now.toISOString(), messages: [],
        };
        await update((current: any) => ({
          ...current,
          vehicles: createdCar ? [...current.vehicles, createdCar] : current.vehicles,
          jobs: [booking, ...(current.jobs || [])],
        }));
      }
      setRequestId(crypto.randomUUID());
      notify('Your urgent request was sent to the selected professional. This is not a confirmed dispatch.');
      go('dashboard/bookings/' + encodeURIComponent(booking.id) + '/messages');
    } catch (reason: any) {
      setError(reason?.message || 'The emergency request could not be sent. Try again or contact roadside assistance directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="roadside-page">
      <header className="roadside-hero">
        <div className="roadside-hero-copy">
          <span className="roadside-eyebrow"><AlertTriangle size={15} /> ROADSIDE ASSISTANCE</span>
          <h2>Stranded? Find help closer to you.</h2>
          <p>Tell a verified professional what happened and where to find you. They can reply, clarify the problem and accept your request.</p>
          <div className="roadside-hero-points"><span><ShieldCheck size={17} /> Verified profiles</span><span><Clock3 size={17} /> Urgent request</span></div>
        </div>
        <div className="roadside-hero-icon" aria-hidden="true"><CarFront size={104} strokeWidth={1.2} /></div>
      </header>
      <p className="roadside-safety" role="note"><AlertTriangle size={18} /> If you are in immediate danger, move to a safe position where possible and call the appropriate emergency services. Verifi Auto is not an emergency-response service and cannot guarantee dispatch or arrival time.</p>
      <form onSubmit={send} className="roadside-layout">
        <div className="roadside-form">
          <Card as="section" className="dash-panel roadside-step">
            <div className="roadside-step-title"><span>01</span><div><h3>What happened?</h3><p>Choose the closest description of your breakdown.</p></div></div>
            <div className="roadside-issues">
              {issues.map((item) => <button key={item} type="button" className={'roadside-issue' + (issue === item ? ' selected' : '')} onClick={() => setIssue(item)} aria-pressed={issue === item}><Wrench size={17} />{item}</button>)}
            </div>
            <label className="roadside-field">Describe the problem
              <textarea required minLength={3} maxLength={4000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="For example: My tyre burst on the N2, and the spare tyre is missing…" />
            </label>
          </Card>
          <Card as="section" className="dash-panel roadside-step">
            <div className="roadside-step-title"><span>02</span><div><h3>Where are you?</h3><p>Give an exact road, exit, landmark or nearby address.</p></div></div>
            <button className="secondary roadside-location-button" type="button" disabled={locating} onClick={locate}><Navigation size={17}/>{locating ? 'Finding your position…' : coordinates ? 'Update my location' : 'Use my current location'}</button>
            {locationNote && <p role="status" className="muted">{locationNote}</p>}
            <label className="roadside-field">Roadside address or landmark
              <input required minLength={5} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Road name, direction, nearest exit, landmark…" />
            </label>
            {coordinates && <p className="roadside-match-note"><MapPin size={16} /> Search automatically starts within 50 km, then expands to 100 km and 200 km if no nearby professionals are found.</p>}
          </Card>
          <Card as="section" className="dash-panel roadside-step">
            <div className="roadside-step-title"><span>03</span><div><h3>Which vehicle?</h3><p>Choose a vehicle or quickly provide its details.</p></div></div>
            <label className="roadside-field">Your vehicle
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Enter vehicle details</option>
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{[v.year, v.make, v.model, v.registration].filter(Boolean).join(' · ')}</option>)}
              </select>
            </label>
            {!vehicleId && <div className="roadside-vehicle-fields">
              <label>Make<input required maxLength={80} value={newVehicle.make} onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })} placeholder="Toyota" /></label>
              <label>Model<input required maxLength={100} value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="Corolla" /></label>
              <label>Year<input required type="number" min={1900} max={new Date().getFullYear() + 1} value={newVehicle.year} onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })} /></label>
              <label>Registration<input required maxLength={30} value={newVehicle.registration} onChange={(e) => setNewVehicle({ ...newVehicle, registration: e.target.value })} placeholder="CA 123 456" /></label>
            </div>}
          </Card>
        </div>
        <aside className="roadside-match">
          <Card as="section" className="dash-panel roadside-step">
            <div className="roadside-step-title"><span>04</span><div><h3>Choose roadside help</h3><p>{matchingLoading ? 'Searching for available roadside professionals…' : matched.length + ' professional' + (matched.length === 1 ? '' : 's') + ' offering roadside assistance.'}</p></div></div>
            {!coordinates && <p className="roadside-match-note"><MapPin size={16} /> Share your location to find the closest opted-in providers. Without GPS, listed workshops are not confirmed nearby.</p>}
            {coordinates && matchingRadius && !fallbackUnlocated && !matchingLoading && matched.length > 0 && (
              <p className="roadside-match-note"><MapPin size={16} /> {matchingRadius === 50 ? 'Found providers within 50 km.' : 'No providers within ' + (matchingRadius === 100 ? 50 : 100) + ' km — expanded search to ' + matchingRadius + ' km.'} Distances are straight-line estimates.</p>
            )}
            {coordinates && fallbackUnlocated && !matchingLoading && (
              <p className="roadside-match-note" role="status"><AlertTriangle size={16} /> No distance-verified matches within 200 km. Showing opted-in workshops without saved coordinates; these are NOT confirmed nearby. Check coverage before relying on assistance.</p>
            )}
            {matchingError && <p className="form-error" role="alert">{matchingError}</p>}
            <div className="roadside-providers">
              {!matchingLoading && matched.map((pro: any) => <button type="button" key={pro.id} className={'roadside-provider' + (selectedId === pro.id ? ' selected' : '')} onClick={() => setSelectedId(pro.id)} aria-pressed={selectedId === pro.id}>
                <span className="roadside-provider-icon"><Wrench size={20}/></span>
                <span className="roadside-provider-copy"><strong>{pro.name}</strong><small>{pro.type} · {pro.area || pro.city || 'Service area not listed'}</small><small>{pro.km != null ? '≈ ' + pro.km.toFixed(1) + ' km straight-line' : 'Distance not available'}</small></span>
                {selectedId === pro.id ? <CheckCircle2 size={21} className="roadside-check" /> : <ArrowRight size={18}/>}
              </button>)}
              {!matchingLoading && !matchingError && !matched.length && <div className="roadside-empty"><Wrench size={28}/><strong>No roadside professionals found within 200 km.</strong><p>No eligible provider is currently listed for this location. Please contact a roadside assistance provider directly; do not rely on an unacknowledged request.</p></div>}
            </div>
            <p className="muted roadside-disclaimer">Distance is not an ETA. Professionals must accept before assistance is confirmed.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary roadside-submit" disabled={!selected || submitting || matchingLoading || !!matchingError} type="submit"><PhoneCall size={18}/>{submitting ? 'Sending urgent request…' : 'Request urgent help'}</button>
            <p className="roadside-after">After sending, open My Bookings to chat, share further details and see whether the professional accepts.</p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
