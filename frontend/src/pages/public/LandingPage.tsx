import { Card } from '../../components/ui/Card';

import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Wrench,
  Car,
  Check,
  ChevronDown,
  FileText,
  Battery,
  Settings,
  Activity,
  CheckCircle2,
} from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function LandingPage({
  anchor,
  city,
  go,
  photo,
  service,
  setCity,
  setService,
  setType,
  shop,
  type,
}: any) {
  return (
    <main>
      <section className="hero">
        <div className="hero-photo" style={{ backgroundImage: `url(${photo})` }} />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow">
            <span /> A BETTER ROAD AHEAD
          </div>
          <h1>
            Confidence in
            <br />
            every <em>kilometre.</em>
          </h1>
          <p>
            Find automotive professionals you can trust.
            <br />
            Keep your car’s story in one place.
          </p>
          <button className="primary" onClick={() => go('find')}>
            Find your professional <ArrowUpRight size={20} />
          </button>
          <button className="text-link hero-link" onClick={() => anchor('how')}>
            See how it works <ArrowRight size={17} />
          </button>
          <div className="hero-points">
            <span>
              <ShieldCheck size={16} /> Credentials that matter
            </span>
            <span>
              <FileText size={16} /> A history that stays with you
            </span>
          </div>
        </div>
        <div className="image-note">
          REAL CARE. LASTING CONFIDENCE.
          <span>From the first inspection to the next adventure.</span>
        </div>
        <div className="floating-credential">
          <span className="verified-icon">
            <ShieldCheck />
          </span>
          <div>
            Trust, made visible<small>Discover our verification standard</small>
          </div>
          <ArrowUpRight size={18} />
        </div>
      </section>
      <div className="search-wrap">
        <form
          className="search-panel"
          onSubmit={(e) => {
            e.preventDefault();
            go('find');
          }}
        >
          <label>
            <span>YOUR LOCATION</span>
            <div>
              <MapPin size={22} />
              <select
                aria-label="Your location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option>All locations</option>
                <option>East London</option>
                <option>Johannesburg</option>
              </select>
            </div>
          </label>
          <label>
            <span>WHAT DOES YOUR CAR NEED?</span>
            <div>
              <Wrench size={22} />
              <select
                aria-label="Service"
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {[
                  'All services',
                  'Servicing',
                  'Diagnostics',
                  'Brakes',
                  'Batteries',
                  'Auto electrical',
                  'Not sure yet',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </label>
          <label>
            <span>YOUR PREFERENCE</span>
            <div>
              <Car size={22} />
              <select
                aria-label="Provider type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>Either</option>
                <option>Workshop</option>
                <option>Mobile mechanic</option>
              </select>
            </div>
          </label>
          <button className="primary" type="submit">
            Explore professionals <ArrowRight size={19} />
          </button>
        </form>
        <p className="pilot-note">Sample locations for the preview · Pilot city to be confirmed</p>
      </div>
      <section className="section services">
        <div className="section-top">
          <div>
            <div className="eyebrow">CARE FOR EVERY JOURNEY</div>
            <h2>
              Whatever’s under the bonnet.
              <br />
              We’ll help you find the right hands.
            </h2>
          </div>
          <button className="text-link" onClick={() => go('find')}>
            Explore services <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="service-grid">
          {[
            [Wrench, 'Servicing', 'Keep your car at its best.'],
            [Activity, 'Diagnostics', 'Get to the root of the problem.'],
            [Settings, 'Brakes', 'Confidence at every stop.'],
            [Battery, 'Batteries', 'Get your day moving again.'],
          ].map(([Icon, title, desc]: any, i) => (
            <Card
              as="button"
              className="service-card"
              key={title}
              onClick={() => {
                setService(title);
                go('find');
              }}
            >
              <div className="card-top">
                <Icon size={26} />
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <ArrowUpRight className="service-arrow" size={19} />
            </Card>
          ))}
        </div>
        <button
          className="unsure"
          onClick={() => {
            setService('Not sure yet');
            go('find');
          }}
        >
          <Activity size={18} />
          <span>
            Not sure what’s wrong? <b>Start with an assessment.</b>
          </span>
          <ArrowRight size={18} />
        </button>
      </section>
      <section className="trust-section section" id="trust">
        <div className="trust-photo">
          <img src={shop} alt="Organised automotive tools inside a workshop" loading="lazy" />
          <div className="photo-label">
            <ShieldCheck size={20} /> MORE THAN A NAME IN A DIRECTORY
          </div>
        </div>
        <div className="trust-content">
          <div className="eyebrow">THE VERIFI DIFFERENCE</div>
          <h2>
            Good mechanics.
            <br />
            <em>Real peace of mind.</em>
          </h2>
          <p>
            You deserve to know who’s working on your car—and what you’re paying for. We’re building
            a clearer way to care for your vehicle.
          </p>
          {[
            [
              'Know who you’re booking',
              'A clear view of identity, qualifications, and the credentials reviewed by Verifi.',
            ],
            [
              'You approve. Then repairs begin.',
              'Review the proposed work and itemised costs before giving the go-ahead.',
            ],
            [
              'Every service has a story',
              'Keep work details, mileage, and supporting documents together.',
            ],
          ].map(([a, b]) => (
            <div className="trust-item" key={a}>
              <Check size={18} />
              <div>
                <h3>{a}</h3>
                <p>{b}</p>
              </div>
            </div>
          ))}
          <small className="muted">
            Verification criteria are proposed for the pilot. Verification is not a guarantee of
            workmanship.
          </small>
        </div>
      </section>
      <section className="section ways">
        <div className="eyebrow">YOUR CAR. YOUR CHOICE.</div>
        <h2>Great care, wherever suits you.</h2>
        <div className="ways-grid">
          <button
            onClick={() => {
              setType('Mobile mechanic');
              go('find');
            }}
          >
            <div>
              <span className="number">01 / AT YOUR DOOR</span>
              <h3>
                Let the workshop
                <br />
                come to you.
              </h3>
              <p>Explore mobile mechanics for service at your home or workplace.</p>
              <span className="text-link">
                Find a mobile mechanic <ArrowUpRight size={18} />
              </span>
            </div>
            <Car size={100} strokeWidth={0.8} />
          </button>
          <button
           
            onClick={() => {
              setType('Workshop');
              go('find');
            }}
          >
            <div>
              <span className="number">02 / IN THE WORKSHOP</span>
              <h3>
                The right tools.
                <br />
                The right people.
              </h3>
              <p>Find a workshop with the expertise your vehicle needs.</p>
              <span className="text-link">
                Explore workshops <ArrowUpRight size={18} />
              </span>
            </div>
            <Wrench size={90} strokeWidth={0.8} />
          </button>
        </div>
      </section>
      <section className="garage-feature section">
        <div>
          <div className="eyebrow">INTRODUCING MY GARAGE</div>
          <h2>
            Your car has a story.
            <br />
            <em>Keep every chapter.</em>
          </h2>
          <p>
            A service book that’s always with you. From routine maintenance to important repairs,
            keep your vehicle’s history organised and ready when you need it.
          </p>
          <button className="primary" onClick={() => go('garage')}>
            Explore My Garage <ArrowUpRight size={18} />
          </button>
        </div>
        <Card as="div" className="record-preview">
          <div className="record-head">
            <span>
              <Car size={24} /> MY GARAGE
            </span>
            <span className="chip">SAMPLE RECORD</span>
          </div>
          <h3>Volkswagen Polo</h3>
          <p>2020 · 1.0 TSI · 68,420 km</p>
          <div className="record-line">
            <span className="timeline-dot" />
            <div>
              <small>14 SEPTEMBER 2026</small>
              <h4>Annual service</h4>
              <p>Oil & filter change · Vehicle inspection</p>
            </div>
            <CheckCircle2 size={18} />
          </div>
          <div className="record-line">
            <span className="timeline-dot" />
            <div>
              <small>08 MARCH 2026</small>
              <h4>Front brake pads replaced</h4>
              <p>Parts and labour recorded</p>
            </div>
            <CheckCircle2 size={18} />
          </div>
          <button className="record-bottom" onClick={() => go('garage')}>
            View vehicle history <ArrowRight size={17} />
          </button>
        </Card>
      </section>
      <section className="section" id="how">
        <div className="eyebrow">LESS GUESSWORK. MORE GOING.</div>
        <h2>A clear road from start to finish.</h2>
        <div className="steps">
          {[
            [
              'Find your professional',
              'Choose a workshop or mobile mechanic that suits your vehicle.',
            ],
            ['Book an assessment', 'Request a time. See any assessment or call-out fee first.'],
            ['Approve your quote', 'Review parts and labour before any repairs begin.'],
            ['Keep the record', 'Pay for completed work and build your vehicle’s history.'],
          ].map(([a, b], i) => (
            <div key={a}>
              <span>0{i + 1}</span>
              <h3>{a}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section faq">
        <div>
          <div className="eyebrow">A LITTLE MORE CLARITY</div>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
        </div>
        <div>
          {[
            [
              'What does “verified” mean?',
              'The planned verification process reviews identity, relevant qualifications, experience, and professional details. Profiles will show which checks were completed and when. The standard is being finalised for the pilot.',
            ],
            [
              'Do I need to know what’s wrong with my car?',
              'No. Choose “Not sure yet” and book an assessment. Your professional can inspect the vehicle and prepare a quote before repairs begin.',
            ],
            [
              'When do I pay?',
              'Any assessment or call-out fee is shown before you confirm. Repair costs require your approval first; payment for completed repairs is planned through the app. This preview does not take payments.',
            ],
            [
              'Where will Verifi Auto launch?',
              'The pilot location is still being decided between East London and Johannesburg. Locations and providers in this preview are illustrative.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronDown size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="professional-banner">
        <div>
          <div className="eyebrow">FOR THE PEOPLE WHO KEEP US MOVING</div>
          <h2>
            Your expertise deserves
            <br />
            to be seen.
          </h2>
          <p>Help shape a more trusted automotive community.</p>
        </div>
        <button className="primary" onClick={() => go('register')}>
          Explore joining Verifi <ArrowUpRight size={19} />
        </button>
      </section>
    </main>
  );
}
