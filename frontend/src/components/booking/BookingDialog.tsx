import { ArrowRight, ShieldCheck, MapPin, Check, X, CheckCircle2 } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function BookingDialog({
  anchor,
  book,
  bookings,
  date,
  go,
  modal,
  role,
  setBookings,
  setDate,
  setModal,
  setStep,
  setTime,
  setVehicle,
  step,
  time,
  type,
  update,
  vehicle,
}: any) {
  return (
    <div className="modal-backdrop" onClick={() => setModal(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={
          modal === 'join' ? 'Join Verifi' : modal.record ? 'Service record' : 'Book an assessment'
        }
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={() => setModal(null)} aria-label="Close dialog">
          <X />
        </button>
        {modal === 'join' ? (
          <>
            <div className="eyebrow">FOR PROFESSIONALS</div>
            <h2>
              Build trust.
              <br />
              Grow your reputation.
            </h2>
            <p>Verifi Auto is being designed for independent mobile mechanics and workshops.</p>
            <div className="join-checks">
              {[
                'Professional profile and service area',
                'Identity and relevant qualification checks',
                'Appointments and itemised quotes',
                'Digital service records for your customers',
              ].map((t) => (
                <p key={t}>
                  <Check size={18} />
                  {t}
                </p>
              ))}
            </div>
            <div className="notice">
              Applications are not open in this design preview. Verification criteria and the pilot
              city are still being finalised.
            </div>
            <button
              className="primary"
              onClick={() => {
                setModal(null);
                anchor('trust');
              }}
            >
              Explore our proposed standard <ArrowRight size={18} />
            </button>
          </>
        ) : modal.record ? (
          <>
            <span className="chip">ILLUSTRATIVE SERVICE RECORD</span>
            <h2>{modal.title}</h2>
            <p>
              {modal.date} · {modal.mileage}
            </p>
            <hr />
            <h3>Work performed</h3>
            <p>{modal.notes}</p>
            <p>Vehicle: Volkswagen Polo · 2020</p>
            <div className="notice">
              Sample record only. No real invoice, provider confirmation, or owner approval is
              attached.
            </div>
            <button className="primary" onClick={() => setModal(null)}>
              Back to My Garage
            </button>
          </>
        ) : step === 2 ? (
          <div className="success">
            <CheckCircle2 size={60} />
            <h2>
              Your demo request
              <br />
              is ready.
            </h2>
            <p>
              {modal.name}
              <br />
              {date} at {time}
            </p>
            <div className="notice">
              No appointment has been sent to a professional and no payment has been taken.
            </div>
            <button
              className="primary"
              onClick={() => {
                setModal(null);
                go('dashboard/bookings');
              }}
            >
              View my bookings <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            <span className="chip">SAMPLE PROFESSIONAL · STEP {step + 1} OF 2</span>
            <h2>{modal.name}</h2>
            <p>
              <MapPin size={16} />
              {modal.area} · {modal.type}
            </p>
            {step === 0 ? (
              <>
                <div className="notice">
                  <ShieldCheck size={21} />
                  <div>
                    <b>How verification will appear</b>
                    <p>
                      Identity, qualification, and experience checks will be shown individually.
                      This fictional profile has not undergone checks.
                    </p>
                  </div>
                </div>
                <h3>Expertise</h3>
                <p>{modal.special}</p>
                <div className="fee-row">
                  <span>Illustrative assessment fee</span>
                  <strong>R{modal.fee}</strong>
                </div>
                <p className="muted">
                  The repair price is separate. You review and approve a quote after the assessment,
                  before repairs begin.
                </p>
                <button
                  className="primary full"
                  onClick={() => {
                    if (role === 'customer') setStep(1);
                    else book(modal);
                  }}
                >
                  Choose an appointment <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBookings([
                    ...bookings,
                    { provider: modal.name, date, time, vehicle, fee: modal.fee },
                  ]);
                  update((d: any) => ({
                    ...d,
                    jobs: [
                      {
                        id: 'VA-' + Date.now().toString().slice(-7),
                        provider: modal.name,
                        date,
                        time,
                        vehicle,
                        fee: modal.fee,
                        status: 'Requested',
                        items: [],
                        notes: '',
                        quoteApproved: false,
                        paid: false,
                      },
                      ...d.jobs,
                    ],
                    notifications: [
                      {
                        id: crypto.randomUUID(),
                        text: 'Your sample assessment request was created.',
                        read: false,
                      },
                      ...d.notifications,
                    ],
                  }));
                  setStep(2);
                }}
              >
                <label>
                  Your vehicle
                  <input
                    autoFocus
                    required
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. 2020 Volkswagen Polo"
                    maxLength={100}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Preferred date
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Preferred time
                    <select value={time} onChange={(e) => setTime(e.target.value)}>
                      {['09:00', '11:00', '14:00', '16:00'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  What needs attention?
                  <textarea
                    placeholder="Describe the symptoms or service you need."
                    maxLength={1000}
                  />
                </label>
                <div className="fee-row">
                  <span>Sample assessment fee</span>
                  <strong>R{modal.fee}</strong>
                </div>
                <p className="muted">
                  Preferred times are illustrative, not confirmed availability. Demo requests are
                  saved in this browser only.
                </p>
                <button className="primary full" type="submit">
                  Create demo request <ArrowRight size={18} />
                </button>
                <button className="text-link back" type="button" onClick={() => setStep(0)}>
                  Back to profile
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
