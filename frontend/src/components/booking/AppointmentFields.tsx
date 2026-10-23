import { vehicleOptionLabel } from '../../features/demo/links';

/** Shared appointment fields; dates are converted to API timestamps by the caller. */
export function AppointmentFields({
  vehicles,
  vehicleId,
  setVehicleId,
  date,
  setDate,
  time,
  setTime,
  description,
  setDescription,
  onAddVehicle,
}: any) {
  return (
    <>
      {vehicles.length ? (
        <label>
          Your vehicle
          <select
            name="vehicleId"
            required
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle: any) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicleOptionLabel(vehicle)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="notice">
          <p>Add a vehicle before requesting an assessment.</p>
          <button className="secondary" type="button" onClick={onAddVehicle}>
            Add vehicle
          </button>
        </div>
      )}
      <div className="form-row">
        <label>
          Preferred date
          <input
            name="date"
            required
            type="date"
            min={new Date().toLocaleDateString('en-CA')}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Preferred time
          <select name="time" value={time} onChange={(e) => setTime(e.target.value)}>
            {['09:00', '11:00', '14:00', '16:00'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        What needs attention?
        <textarea
          name="description"
          required
          minLength={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the symptoms or service you need."
        />
      </label>
    </>
  );
}
