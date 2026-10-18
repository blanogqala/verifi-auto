import { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, X } from 'lucide-react';
import { activeVehicles, vehicleOptionLabel } from '../../features/demo/links';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { createBooking, saveVehicle, updateRequestedBooking } from '../../features/demo/demoActions';
import { demoCustomerId } from '../../features/admin/customerRecords';

/** Appointment form. The introduction step is not part of booking. */
export function BookingDialog({
  anchor,
  customerId,
  date,
  description,
  editingJob,
  go,
  modal,
  requestId,
  setDate,
  setDescription,
  setModal,
  setRequestId,
  setStep,
  setTime,
  setVehicleId,
  step,
  time,
  update,
  notify,
  vehicleId,
  vehicles,
}: any) {
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const choices = activeVehicles(vehicles || []);
  const ownerId = customerId || demoCustomerId;

  function close() {
    setModal(null);
    setAdding(false);
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={modal === 'join' ? 'Join Verifi' : editingJob ? 'Edit request' : 'Book an assessment'}
        className="modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={close} aria-label="Close dialog">
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
            <div className="notice">
              Applications are not open in this design preview. Verification criteria and the pilot
              city are still being finalised.
            </div>
            <button
              className="primary"
              onClick={() => {
                close();
                anchor('trust');
              }}
            >
              Explore our proposed standard <ArrowRight size={18} />
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
              No appointment has been sent to a professional and no payment has been taken. The time
              is a preference, not confirmed availability.
            </div>
            <button
              className="primary"
              onClick={() => {
                close();
                go('dashboard/bookings');
              }}
            >
              View my bookings <ArrowRight size={18} />
            </button>
          </div>
        ) : adding ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              let createdId = '';
              const saved = commitUpdate(
                update,
                (current: any) => {
                  const next = saveVehicle(current, {
                    make: form.get('make'),
                    model: form.get('model'),
                    year: form.get('year'),
                    registration: form.get('registration'),
                    mileage: form.get('mileage'),
                    bodyStyle: form.get('bodyStyle'),
                    variant: form.get('variant'),
                    paintColor: form.get('usePaint') ? form.get('paintColor') : '',
                    licenceDiscSource: 'owner',
                    nextServiceSource: 'owner',
                  });
                  createdId = next.vehicles[next.vehicles.length - 1].id;
                  return next;
                },
                setError,
                '',
              );
              if (!saved) return;
              setVehicleId(createdId);
              setAdding(false);
              setError('');
            }}
          >
            <h2>Add vehicle</h2>
            <p className="muted">Enter the vehicle for this appointment. Make, model, year, and registration are required.</p>
            <div className="form-row">
              <label>
                Make
                <input name="make" required autoComplete="off" />
              </label>
              <label>
                Model
                <input name="model" required autoComplete="off" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Year
                <input name="year" type="number" inputMode="numeric" autoComplete="off" min="1900" max="2027" required defaultValue={2020} />
              </label>
              <label>
                Mileage (km)
                <input name="mileage" type="number" inputMode="numeric" autoComplete="off" min="0" required defaultValue={0} />
              </label>
            </div>
            <label>
              Registration
              <input name="registration" required autoComplete="off" defaultValue="DEMO 002" />
            </label>
            <div className="form-row">
              <label>
                Body style
                <select name="bodyStyle" defaultValue="">
                  <option value="">Not specified</option>
                  <option value="hatchback">hatchback</option>
                  <option value="sedan">sedan</option>
                  <option value="estate">estate</option>
                  <option value="coupe">coupe</option>
                  <option value="suv">suv</option>
                  <option value="van">van</option>
                </select>
              </label>
              <label>
                Variant
                <input name="variant" />
              </label>
            </div>
            <label className="check-label">
              <input name="usePaint" type="checkbox" />
              Set a body colour
            </label>
            <label>
              Paint colour
              <input name="paintColor" type="color" defaultValue="#f2f2f2" />
            </label>
            <p className="muted">Paint colour and body style are saved with the vehicle.</p>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary full" type="submit">
              Save vehicle <Check size={17} />
            </button>
            <button className="text-link back" type="button" onClick={() => setAdding(false)}>
              Back to appointment
            </button>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (submitting) return;
              setSubmitting(true);
              setError('');
              try {
                const vehicle = choices.find((item) => item.id === vehicleId);
                let duplicate = false;
                const saved = commitUpdate(
                  update,
                  (current: any) => {
                    if (editingJob) {
                      return updateRequestedBooking(current, {
                        bookingId: editingJob.id,
                        customerId: ownerId,
                        vehicleId,
                        date,
                        time,
                        description,
                      });
                    }
                    const result = createBooking(current, {
                      professional: modal,
                      vehicle,
                      date,
                      time,
                      description,
                      customerId: ownerId,
                      clientRequestId: requestId,
                    });
                    duplicate = result.duplicate;
                    return result.data;
                  },
                  setError,
                  '',
                );
                if (!saved) return;
                if (duplicate) {
                  setError('This request was already saved.');
                  return;
                }
                if (editingJob) {
                  notify('Demo request updated in this browser.');
                  close();
                } else {
                  setRequestId(crypto.randomUUID());
                  setStep(2);
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <span className="chip">SAMPLE PROFESSIONAL</span>
            <h2>{modal.name}</h2>
            <p>
              {modal.area} · {modal.type}
            </p>
            <div className="fee-row">
              <span>Assessment fee</span>
              <strong>R{modal.fee}</strong>
            </div>
            <p className="muted">
              The assessment fee is separate from future repair costs. A preferred time is not
              confirmed availability.
            </p>
            {choices.length ? (
              <label>
                Your vehicle
                <select
                  required
                  autoFocus
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">Select a vehicle</option>
                  {choices.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicleOptionLabel(vehicle)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="notice">
                <p>Add a vehicle before requesting an assessment.</p>
                <button className="secondary" type="button" onClick={() => setAdding(true)}>
                  Add vehicle
                </button>
              </div>
            )}
            <div className="form-row">
              <label>
                Preferred date
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label>
                Preferred time
                <select value={time} onChange={(event) => setTime(event.target.value)}>
                  {['09:00', '11:00', '14:00', '16:00'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              What needs attention?
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the symptoms or service you need."
              />
            </label>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary full" type="submit" disabled={submitting || !choices.length}>
              {submitting ? 'Saving request' : editingJob ? 'Save changes' : 'Create demo request'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
