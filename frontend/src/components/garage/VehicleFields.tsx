import { calendarDateInput } from '../../features/garage/vehicleDates';
import { PaintColourField } from './PaintColourField';
import { bodyStyleOptions } from '../../features/garage/vehicleCatalogue';

/** One field layout for both the demo and authenticated vehicle forms. */
export function VehicleFields({ vehicle }: { vehicle?: any }) {
  return (
    <>
      <div className="form-row">
        <label>
          Make
          <input name="make" required autoComplete="off" defaultValue={vehicle?.make} />
        </label>
        <label>
          Model
          <input name="model" required autoComplete="off" defaultValue={vehicle?.model} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Body style
          <select name="bodyStyle" defaultValue={vehicle?.bodyStyle || ''}>
            <option value="">Not specified</option>
            {bodyStyleOptions.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <label>
          Variant
          <input name="variant" defaultValue={vehicle?.variant || ''} />
        </label>
      </div>
      <PaintColourField
        key={vehicle?.id || 'new'}
        color={vehicle?.paintColor}
        name={vehicle?.paintColorName}
      />
      <div className="form-row">
        <label>
          Year
          <input
            name="year"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="1900"
            max={new Date().getFullYear() + 1}
            required
            defaultValue={vehicle?.year || 2020}
          />
        </label>
        <label>
          Mileage (km)
          <input
            name="mileage"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="0"
            max="5000000"
            required
            defaultValue={vehicle?.mileage || 0}
          />
        </label>
      </div>
      <label>
        Registration
        <input
          name="registration"
          required
          autoComplete="off"
          defaultValue={vehicle?.registration || ''}
        />
      </label>
      <div className="form-row">
        <label>
          Licence disc expiry
          <input
            name="licenceDiscExpiry"
            type="date"
            defaultValue={calendarDateInput(vehicle?.licenceDiscExpiry)}
          />
        </label>
        <label>
          Who recorded the licence date
          <select name="licenceDiscSource" defaultValue={vehicle?.licenceDiscSource || 'owner'}>
            <option value="owner">Entered by the owner</option>
            <option value="mechanic">Recorded by a mechanic</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Next service date
          <input
            name="nextServiceDate"
            type="date"
            defaultValue={calendarDateInput(vehicle?.nextServiceDate)}
          />
        </label>
        <label>
          Next service mileage
          <input
            name="nextServiceMileage"
            type="number"
            min="0"
            defaultValue={vehicle?.nextServiceMileage || ''}
          />
        </label>
      </div>
      <label>
        Who recorded the next service
        <select name="nextServiceSource" defaultValue={vehicle?.nextServiceSource || 'owner'}>
          <option value="owner">Entered by the owner</option>
          <option value="mechanic">Recorded by a mechanic</option>
        </select>
      </label>
      <p className="muted">
        Leave a date blank when it has not been recorded. No service interval is assumed.
      </p>
    </>
  );
}
